import { describe, expect, it } from "vitest";
import { MAX_SIMULATED_ROUNDS, simulateSchedule } from "./tournament-planning";
import {
	buildEncounterMatrices,
	type GeneratedMatch,
	generateRound,
	generateRoundRobinRound,
	getCompletedPairsSet,
	getRoundRobinProgress,
	type MatchHistoryInput,
	type PlayerInput,
} from "./utils";

const players = (count: number): PlayerInput[] =>
	Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		firstname: `Joueur ${i + 1}`,
		lastname: "",
		gender: i % 2 ? "F" : "M",
		playedGames: 0,
	}));
function historyMatch(
	first: number[],
	second: number[],
	matchId = 1,
	roundNumber = matchId,
	status: "waiting" | "finished" = "finished",
): MatchHistoryInput[] {
	return [first, second].flatMap((team, i) =>
		team.map((playerId) => ({
			matchId,
			roundNumber,
			status,
			playerId,
			team: i + 1,
		})),
	);
}
const activeIds = (matches: GeneratedMatch[]) =>
	matches.flatMap((m) => [...m.team1Ids, ...m.team2Ids]);
const pairs = (matches: GeneratedMatch[]) =>
	matches
		.flatMap((m) => [m.team1Ids, m.team2Ids])
		.map((ids) => [...ids].sort((a, b) => a - b).join(","));
function record(
	ps: PlayerInput[],
	history: MatchHistoryInput[],
	matches: GeneratedMatch[],
	status: "waiting" | "finished" = "finished",
) {
	let id = history.reduce((max, row) => Math.max(max, row.matchId), 0) + 1;
	for (const match of matches)
		history.push(
			...historyMatch(
				match.team1Ids,
				match.team2Ids,
				id++,
				match.roundNumber,
				status,
			),
		);
	const active = new Set(activeIds(matches));
	for (const player of ps) if (active.has(player.id)) player.playedGames++;
}
function forecast(count = 12, courts = 4) {
	return {
		players: players(count),
		history: [] as MatchHistoryInput[],
		availableCourts: courts,
		currentRound: 0,
		roundType: "roundrobin" as "roundrobin" | "fixed" | "infinite",
		maxRounds: 5,
		maximizeParity: false,
		status: "active" as "active" | "finished",
	};
}

describe("selection and rest", () => {
	for (const [count, courts, expected] of [
		[4, 1, 1],
		[6, 2, 1],
		[8, 2, 2],
		[10, 3, 2],
		[12, 4, 3],
		[16, 2, 2],
	]) {
		it(`${count} players / ${courts} courts yields ${expected} complete doubles`, () => {
			for (const generator of [generateRound, generateRoundRobinRound]) {
				const result = generator(players(count), [], courts, 1, false);
				expect(result.matches).toHaveLength(expected);
				const active = activeIds(result.matches);
				expect(new Set(active).size).toBe(expected * 4);
				expect(result.restingPlayerIds).toHaveLength(count - expected * 4);
				expect(
					[...active, ...result.restingPlayerIds].sort((a, b) => a - b),
				).toEqual(players(count).map((p) => p.id));
				for (const match of result.matches) {
					expect(match.team1Ids).toHaveLength(2);
					expect(match.team2Ids).toHaveLength(2);
				}
			}
		});
	}
	it("refuses fewer than four present players", () => {
		const ps = players(4);
		ps[0].present = false;
		expect(() => generateRound(ps, [], 2, 1, false)).toThrow("assez");
	});
	it("excludes absentees and prioritizes a newcomer without losing history", () => {
		const ps = players(5);
		ps.forEach((p) => {
			p.playedGames = 4;
		});
		ps[4].playedGames = 0;
		ps[0].present = false;
		const history = historyMatch([1, 2], [3, 4]);
		const before = structuredClone(history);
		const ids = activeIds(generateRound(ps, history, 1, 5, false).matches);
		expect(ids).toContain(5);
		expect(ids).not.toContain(1);
		expect(history).toEqual(before);
	});
	it("participation count dominates wait time and composition quality", () => {
		const ps = players(8);
		ps[7].playedGames = 0;
		for (const p of ps.slice(0, 7)) p.playedGames = 4;
		const history = historyMatch([8, 1], [2, 3], 1, 99);
		expect(
			activeIds(generateRound(ps, history, 1, 100, false).matches),
		).toContain(8);
	});
	it("longest wait breaks equal participation counts before stable IDs", () => {
		const ps = players(8).map((p) => ({ ...p, playedGames: 1 }));
		const history = [
			...historyMatch([5, 6], [7, 8], 1, 1),
			...historyMatch([1, 2], [3, 4], 2, 2),
		];
		expect(
			activeIds(generateRound(ps, history, 1, 3, false).matches).sort(
				(a, b) => a - b,
			),
		).toEqual([5, 6, 7, 8]);
	});
	for (const [count, courts] of [
		[6, 2],
		[10, 3],
		[16, 2],
	])
		it(`balances assigned games across 24 rounds for ${count} players`, () => {
			const ps = players(count),
				history: MatchHistoryInput[] = [];
			for (let round = 1; round <= 24; round++) {
				const generated = generateRound(ps, history, courts, round, false);
				record(ps, history, generated.matches);
				const counts = ps.map((p) => p.playedGames);
				expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(
					1,
				);
			}
		});
	it("rejects duplicate identities and invalid court counts", () => {
		expect(() =>
			generateRound([...players(4), players(4)[0]], [], 1, 1, false),
		).toThrow("doublons");
		expect(() => generateRound(players(4), [], 1.5, 1, false)).toThrow(
			"entier",
		);
	});
});

describe("partner, opponent and mixed priorities", () => {
	it("counts each partnership once and the four individual opponent encounters", () => {
		const matrices = buildEncounterMatrices(historyMatch([1, 2], [3, 4]));
		expect([...matrices.partnerships]).toEqual([
			["1,2", 1],
			["3,4", 1],
		]);
		expect([...matrices.opponents.keys()].sort()).toEqual([
			"1,3",
			"1,4",
			"2,3",
			"2,4",
		]);
	});
	it("prefers previously unseen partners", () => {
		const chosen = pairs(
			generateRound(players(4), historyMatch([1, 2], [3, 4]), 1, 2, false)
				.matches,
		);
		expect(chosen).not.toContain("1,2");
		expect(chosen).not.toContain("3,4");
	});
	it("penalizes very frequent partnerships quadratically", () => {
		const history: MatchHistoryInput[] = [];
		let id = 1;
		for (const [a, b, count] of [
			[1, 2, 5],
			[3, 4, 1],
			[1, 3, 3],
			[2, 4, 3],
			[1, 4, 3],
			[2, 3, 4],
		])
			for (let i = 0; i < count; i++)
				history.push(...historyMatch([a, b], [50, 51], id++));
		expect(
			pairs(generateRound(players(4), history, 1, 30, false).matches),
		).toEqual(["1,3", "2,4"]);
	});
	it("uses opponent diversity when partnership quality is equal", () => {
		const history = historyMatch([1, 5], [3, 6]);
		expect(
			pairs(generateRound(players(4), history, 1, 2, false).matches),
		).toEqual(["1,3", "2,4"]);
	});
	it("never trades better partners for better opponents", () => {
		const history = historyMatch([1, 2], [3, 4]);
		for (let i = 0; i < 10; i++)
			history.push(
				...historyMatch([1, 5], [2, 6], 2 + i * 2),
				...historyMatch([3, 7], [4, 8], 3 + i * 2),
			);
		const chosen = pairs(
			generateRound(players(4), history, 1, 30, false).matches,
		);
		expect(chosen).not.toContain("1,2");
		expect(chosen).not.toContain("3,4");
	});
	it("prefers mixed teams only after partner and opponent quality", () => {
		const ps = players(4);
		ps[0].gender = "M";
		ps[1].gender = "M";
		ps[2].gender = "F";
		ps[3].gender = "F";
		const before = structuredClone(ps);
		expect(pairs(generateRound(ps, [], 1, 1, true).matches)).toEqual([
			"1,3",
			"2,4",
		]);
		// Avoiding the repeated opponent pair 1,2 outweighs mixed composition.
		expect(
			pairs(
				generateRound(ps, historyMatch([1, 5], [2, 6]), 1, 2, true).matches,
			),
		).toEqual(["1,2", "3,4"]);
		expect(ps).toEqual(before);
	});
	it("never requires a mixed composition to generate doubles", () => {
		const ps = players(12).map((p) => ({ ...p, gender: "M" }));
		expect(generateRound(ps, [], 4, 1, true).matches).toHaveLength(3);
	});
	it("applies the same mixed engine to all formats", () => {
		const ps = players(8),
			history = historyMatch([1, 2], [3, 4]);
		expect(generateRoundRobinRound(ps, history, 2, 2, true)).toEqual(
			generateRound(ps, history, 2, 2, true),
		);
	});
	for (const count of [4, 8, 12, 16, 48])
		it(`is stable for ${count} players, regardless of input order`, () => {
			const ps = players(count),
				history = [
					...historyMatch([1, 2], [3, 4]),
					...historyMatch([5, 6], [7, 8], 2),
				];
			const expected = generateRound(ps, history, 12, 3, true);
			expect(
				generateRound([...ps].reverse(), [...history].reverse(), 12, 3, true),
			).toEqual(expected);
			expect(new Set(activeIds(expected.matches)).size).toBe(
				expected.matches.length * 4,
			);
		});
});

describe("completed coverage and population", () => {
	it("starts at zero and ignores planned partnerships", () => {
		expect(getRoundRobinProgress(players(4), [], 1).progress).toBe(0);
		const waiting = historyMatch([1, 2], [3, 4], 1, 1, "waiting");
		expect(getRoundRobinProgress(players(4), waiting, 1).completedPairs).toBe(
			0,
		);
		expect(buildEncounterMatrices(waiting).partnerships.size).toBe(2);
		const finished = waiting.map((p) => ({
			...p,
			status: "finished" as const,
		}));
		expect(getRoundRobinProgress(players(4), finished, 1).completedPairs).toBe(
			2,
		);
	});
	it("recalculates reference pairs after presence changes without losing history", () => {
		const history = [
			...historyMatch([1, 5], [2, 6]),
			...historyMatch([3, 4], [5, 6], 2),
		];
		const initial = getRoundRobinProgress(players(6), history, 2);
		const changed = getRoundRobinProgress(players(4), history, 2);
		expect(initial.completedPairs).toBe(4);
		expect(changed.completedPairs).toBe(1);
		expect(changed.populationSize).toBe(4);
		expect(changed.totalPairs).toBe(6);
		expect(getCompletedPairsSet(history).size).toBe(4);
		for (let n = 0; n <= 6; n++) {
			const p = getRoundRobinProgress(players(n), history, 2);
			expect(p.progress).toBeGreaterThanOrEqual(0);
			expect(p.progress).toBeLessThanOrEqual(1);
		}
	});
	it("achieves all partnerships for four players and waits for the last match", () => {
		const ps = players(4),
			history: MatchHistoryInput[] = [];
		for (let r = 1; r <= 3; r++)
			record(
				ps,
				history,
				generateRound(ps, history, 1, r, false).matches,
				r === 3 ? "waiting" : "finished",
			);
		expect(getRoundRobinProgress(ps, history, 1).complete).toBe(false);
		expect(
			getRoundRobinProgress(
				ps,
				history.map((p) => ({ ...p, status: "finished" })),
				1,
			).complete,
		).toBe(true);
	});
	it("does not finish vacuously with fewer than four present players", () => {
		expect(getRoundRobinProgress(players(0), [], 1).complete).toBe(false);
		expect(
			getRoundRobinProgress(players(2), historyMatch([1, 2], [3, 4]), 1)
				.complete,
		).toBe(false);
	});
});

describe("forecast", () => {
	it("limits a five-round fixed tournament to rounds 3, 4 and 5", () => {
		const input = forecast(8, 2);
		input.roundType = "fixed";
		input.currentRound = 2;
		const result = simulateSchedule(input);
		expect(result.rounds.map((r) => r.roundNumber)).toEqual([3, 4, 5]);
		expect(result.partial).toBe(false);
		expect(result.remainingRounds).toBe(3);
	});
	it("has no predetermined total in free mode", () => {
		const input = forecast();
		input.roundType = "infinite";
		const result = simulateSchedule(input);
		expect(result.rounds).toEqual([]);
		expect(result.remainingRounds).toBeNull();
		expect(result.message).toContain("arrêt manuel");
	});
	it("returns a bounded partial estimate instead of stopping at the first unproductive round", () => {
		// Strict participation/longest-wait priority keeps these two groups apart.
		const result = simulateSchedule(forecast(8, 1));
		expect(result.rounds).toHaveLength(MAX_SIMULATED_ROUNDS);
		expect(result.coverageReached).toBe(false);
		expect(result.partial).toBe(true);
		expect(result.message).toContain("Estimation partielle");
		expect(result.message).toContain("manuellement");
		expect(result.rounds.at(-1)?.remainingPairs).toBeGreaterThan(0);
	});
	it("caps long fixed forecasts without pretending all rounds were simulated", () => {
		const input = forecast(4, 1);
		input.roundType = "fixed";
		input.maxRounds = 100;
		const result = simulateSchedule(input);
		expect(result.rounds).toHaveLength(MAX_SIMULATED_ROUNDS);
		expect(result.remainingRounds).toBe(100);
		expect(result.partial).toBe(true);
	});
	it("forecasts full coverage when found and never mutates inputs", () => {
		const input = forecast(8, 2),
			before = structuredClone(input);
		const result = simulateSchedule(input);
		expect(result.coverageReached).toBe(true);
		expect(result.partial).toBe(false);
		expect(result.rounds.at(-1)?.remainingPairs).toBe(0);
		expect(input).toEqual(before);
		for (const r of result.rounds) {
			expect(r.matches).toHaveLength(2);
			expect(new Set(activeIds(r.matches)).size).toBe(8);
		}
	});
	it("provides an explicit exit with insufficient players", () => {
		const result = simulateSchedule(forecast(3, 2));
		expect(result.partial).toBe(true);
		expect(result.message).toContain("quatre");
		expect(result.message).toContain("manuellement");
	});
	it("does not plan new rotations after closure", () => {
		const input = forecast();
		input.status = "finished";
		expect(simulateSchedule(input).rounds).toEqual([]);
	});
	it("reproduces the old 12-player plateau at 62/66 and never declares false coverage", () => {
		// Exact 15-round fixture produced by the previous greedy Round-Robin engine.
		const oldRounds = [
			"1,2 3,4 5,6 7,8 9,10 11,12",
			"1,3 2,4 5,7 6,8 9,11 10,12",
			"1,4 2,3 5,8 6,7 9,12 10,11",
			"1,5 2,6 3,7 4,8 9,10 11,12",
			"1,6 2,5 3,8 4,7 9,11 10,12",
			"1,7 2,8 3,5 4,6 9,12 10,11",
			"1,8 2,7 3,6 4,5 9,10 11,12",
			"1,9 2,10 3,11 4,12 5,6 7,8",
			"1,10 2,9 3,12 4,11 5,7 6,8",
			"1,11 2,12 3,9 4,10 5,8 6,7",
			"1,12 2,11 3,10 4,9 5,6 7,8",
			"1,2 3,4 5,9 6,10 7,11 8,12",
			"1,3 2,4 5,10 6,9 7,12 8,11",
			"1,4 2,3 5,11 6,12 7,9 8,10",
			"1,5 2,6 3,7 4,8 9,11 10,12",
		];
		const input = forecast();
		let matchId = 1;
		for (const [roundIndex, line] of oldRounds.entries()) {
			const teams = line.split(" ").map((pair) => pair.split(",").map(Number));
			for (let i = 0; i < teams.length; i += 2)
				input.history.push(
					...historyMatch(teams[i], teams[i + 1], matchId++, roundIndex + 1),
				);
		}
		input.currentRound = 15;
		input.players.forEach((p) => {
			p.playedGames = 15;
		});
		expect(getCompletedPairsSet(input.history).size).toBe(62);
		const result = simulateSchedule(input);
		expect(result.rounds.length).toBeGreaterThan(0);
		expect(result.rounds.length).toBeLessThanOrEqual(MAX_SIMULATED_ROUNDS);
		if (result.coverageReached)
			expect(result.rounds.at(-1)?.remainingPairs).toBe(0);
		else {
			expect(result.partial).toBe(true);
			expect(result.message).toContain("partielle");
		}
		const simulated = [...input.history];
		for (const r of result.rounds)
			for (const m of r.matches)
				simulated.push(
					...historyMatch(m.team1Ids, m.team2Ids, matchId++, r.roundNumber),
				);
		expect(getCompletedPairsSet(simulated).size === 66).toBe(
			result.coverageReached,
		);
	});
});

it("shortens large forecasts with a deterministic workload budget", () => {
	const result = simulateSchedule(forecast(48, 12));
	expect(result.simulationLimit).toBe(3);
	expect(result.rounds).toHaveLength(result.simulationLimit);
	expect(result.partial).toBe(true);
	expect(result.coverageReached).toBe(false);
});
