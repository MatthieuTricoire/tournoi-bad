import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import type { Client } from "@libsql/client";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// The real production adapter is exercised with a temporary local libSQL client.
// No dotenv/Vite app config is loaded; production credentials are never used.
const { testDirectory, connection } = await vi.hoisted(async () => {
	const { mkdtempSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const testDirectory = mkdtempSync(join(tmpdir(), "badminton-t1-"));
	process.env.DATABASE_URL = `file:${join(testDirectory, "test.db")}`;
	return {
		testDirectory,
		connection: { client: undefined as Client | undefined, sequence: 0 },
	};
});
vi.mock("@libsql/client/http", async () => {
	const { createClient } = await import("@libsql/client");
	return {
		createClient: (config: { url: string }) => {
			connection.client = createClient({ url: config.url });
			return new Proxy({} as Client, {
				get(_target, property) {
					const client = connection.client;
					if (!client) throw new Error("Missing test client");
					const value = Reflect.get(client, property);
					return typeof value === "function" ? value.bind(client) : value;
				},
			});
		},
	};
});
// Only the RPC transport is replaced. Real schemas, handlers, SQL and
// transactions are used, including input validation and failure propagation.
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		let validator: { parse: (data: unknown) => unknown } | undefined;
		const builder = {
			inputValidator(schema: typeof validator) {
				validator = schema;
				return builder;
			},
			handler(fn: (options: { data?: unknown }) => unknown) {
				return async (options?: { data?: unknown }) =>
					fn({ data: validator ? validator.parse(options?.data) : undefined });
			},
		};
		return builder;
	},
}));

import { db } from "./src/db";
import {
	matches,
	matchParticipants,
	players,
	tournamentSettings,
} from "./src/db/schema";
import {
	deletePlayer,
	togglePlayerPresence,
} from "./src/server/functions/players";
import {
	finishTournament,
	getCurrentRoundData,
	getLeaderBoard,
	getMatchHistory,
	getRankingData,
	getRoundRobinSchedule,
	startNextRound,
	submitMatchScore,
	updateMatchScore,
} from "./src/server/functions/tournaments";

beforeEach(async () => {
	// A fresh file isolates native-client connection/statement state after lock failures.
	connection.client?.close();
	const { createClient } = await import("@libsql/client");
	connection.client = createClient({
		url: `file:${testDirectory}/case-${connection.sequence++}.db`,
	});
	await db.$client.executeMultiple(
		readFileSync(
			new URL("./drizzle/0000_mixed_wild_child.sql", import.meta.url),
			"utf8",
		),
	);
	await db.insert(tournamentSettings).values({ id: 1, availableCourts: 1 });
	await db
		.insert(players)
		.values(
			Array.from({ length: 4 }, (_, i) => ({ firstname: `Joueur ${i + 1}` })),
		);
});
afterAll(async () => {
	db.$client.close();
	await rm(testDirectory, { recursive: true, force: true });
});

async function currentMatch() {
	const match = await db
		.select()
		.from(matches)
		.orderBy(sql`${matches.id} desc`)
		.get();
	if (!match) throw new Error("Expected match");
	return match;
}
async function score(a = 21, b = 15) {
	return submitMatchScore({
		data: { matchId: (await currentMatch()).id, scoreTeam1: a, scoreTeam2: b },
	});
}
async function settings() {
	return db.select().from(tournamentSettings).get();
}

it("generates a free round with four distinct players and participation counters", async () => {
	await startNextRound();
	expect(await db.select().from(matches)).toHaveLength(1);
	const participants = await db.select().from(matchParticipants);
	expect(new Set(participants.map((p) => p.playerId)).size).toBe(4);
	expect(participants.filter((p) => p.team === 1)).toHaveLength(2);
	expect((await db.select().from(players)).map((p) => p.playedGames)).toEqual([
		1, 1, 1, 1,
	]);
	expect((await settings())?.currentRound).toBe(1);
});
it("runs several fixed rounds and closes only on the final result", async () => {
	await db.update(tournamentSettings).set({ roundType: "fixed", maxRounds: 2 });
	await startNextRound();
	await score();
	expect((await settings())?.status).toBe("active");
	await startNextRound();
	expect((await settings())?.status).toBe("active");
	await score();
	expect((await settings())?.status).toBe("finished");
	expect((await db.select().from(matches)).map((m) => m.roundNumber)).toEqual([
		1, 2,
	]);
	expect(
		(await db.select().from(players)).every((p) => p.playedGames === 2),
	).toBe(true);
	await expect(startNextRound()).rejects.toThrow("terminé");
});
it("refuses another round while any score is missing", async () => {
	await startNextRound();
	await expect(startNextRound()).rejects.toThrow("scores");
	expect(await db.select().from(matches)).toHaveLength(1);
});
it("concurrent generation creates only one round", async () => {
	const results = await Promise.allSettled([
		startNextRound(),
		startNextRound(),
	]);
	expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
	expect(await db.select().from(matches)).toHaveLength(1);
	expect(await db.select().from(matchParticipants)).toHaveLength(4);
});
it("refuses a repeated score without changing results", async () => {
	await startNextRound();
	await score();
	const before = await getRankingData();
	await expect(score()).rejects.toThrow("déjà");
	expect(await getRankingData()).toEqual(before);
	expect(
		(await db.select().from(players)).map((p) => p.totalScore).sort(),
	).toEqual([15, 15, 21, 21]);
});
it("two simultaneous submissions cannot both produce effects", async () => {
	await startNextRound();
	const results = await Promise.allSettled([score(21, 15), score(10, 8)]);
	expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
	const ranking = await getRankingData();
	expect(ranking).toHaveLength(4);
	expect(ranking.every((p) => p.playedGames === 1)).toBe(true);
	const persisted = await db.select().from(matchParticipants);
	expect(ranking.map((p) => p.totalScore).sort((a, b) => a - b)).toEqual(
		persisted.map((p) => p.teamScore).sort((a, b) => a - b),
	);
	expect(
		(await db.select().from(players))
			.map((p) => p.totalScore)
			.sort((a, b) => a - b),
	).toEqual(ranking.map((p) => p.totalScore).sort((a, b) => a - b));
});
it("correction replaces points and reverses wins/losses", async () => {
	await startNextRound();
	await score();
	const id = (await currentMatch()).id;
	await updateMatchScore({
		data: { matchId: id, scoreTeam1: 7, scoreTeam2: 22 },
	});
	const ranking = await getRankingData();
	expect(ranking.map((p) => p.totalScore)).toEqual([22, 22, 7, 7]);
	expect(ranking.map((p) => p.wins)).toEqual([1, 1, 0, 0]);
	expect(ranking.map((p) => p.losses)).toEqual([0, 0, 1, 1]);
	expect(
		(await db.select().from(players))
			.map((p) => p.totalScore)
			.sort((a, b) => a - b),
	).toEqual([7, 7, 22, 22]);
	await updateMatchScore({
		data: { matchId: id, scoreTeam1: 7, scoreTeam2: 22 },
	});
	expect(await getRankingData()).toEqual(ranking);
});
it("refuses corrections of waiting matches and exposes their status", async () => {
	await startNextRound();
	await expect(
		updateMatchScore({
			data: {
				matchId: (await currentMatch()).id,
				scoreTeam1: 21,
				scoreTeam2: 0,
			},
		}),
	).rejects.toThrow("attente");
	expect(await getRankingData()).toEqual([]);
	expect((await currentMatch()).status).toBe("waiting");
	expect((await getMatchHistory())[0].matches[0].status).toBe("waiting");
	expect(
		(await db.select().from(matchParticipants)).every((p) => p.teamScore === 0),
	).toBe(true);
});
it("ranking ignores pending rounds, includes absent players and agrees across endpoints", async () => {
	expect(await getRankingData()).toEqual([]);
	await startNextRound();
	expect(await getRankingData()).toEqual([]);
	await score();
	const ranking = await getRankingData();
	expect(ranking).toHaveLength(4);
	await startNextRound();
	expect(await getRankingData()).toEqual(ranking);
	await togglePlayerPresence({
		data: { playerId: ranking[0].id, isPresent: false },
	});
	expect(await getRankingData()).toEqual(ranking);
	expect(await getLeaderBoard()).toEqual(ranking);
});
it("uses exact averages and competition ranks for ties", async () => {
	await startNextRound();
	await score(21, 21);
	expect((await getRankingData()).map((p) => p.ranking)).toEqual([1, 1, 1, 1]);
	await startNextRound();
	await score(21, 20);
	const ranked = await getRankingData();
	expect(ranked.map((p) => p.ranking)).toEqual([1, 1, 3, 3]);
	expect(ranked.map((p) => p.averageScore)).toEqual([21, 21, 20.5, 20.5]);
});
it("corrections after closure update ranking without reopening", async () => {
	await db.update(tournamentSettings).set({ roundType: "fixed", maxRounds: 1 });
	await startNextRound();
	await score();
	await updateMatchScore({
		data: { matchId: (await currentMatch()).id, scoreTeam1: 0, scoreTeam2: 30 },
	});
	expect((await settings())?.status).toBe("finished");
	expect((await getRankingData()).map((p) => p.totalScore)).toEqual([
		30, 30, 0, 0,
	]);
});
it("manual closure refuses missing scores and blocks subsequent generation", async () => {
	await startNextRound();
	await expect(finishTournament()).rejects.toThrow("scores");
	await score();
	await finishTournament();
	expect((await settings())?.status).toBe("finished");
	await expect(startNextRound()).rejects.toThrow("terminé");
});
it("Round-Robin preserves its coverage rule but waits for every score", async () => {
	await db.update(tournamentSettings).set({ roundType: "roundrobin" });
	for (let i = 0; i < 3; i++) {
		await startNextRound();
		expect((await settings())?.status).toBe("active");
		await score();
	}
	expect((await settings())?.status).toBe("finished");
	await expect(startNextRound()).rejects.toThrow("terminé");
});
it("cannot delete a participant, even if absent or not yet scored", async () => {
	await startNextRound();
	const p = (await db.select().from(players))[0];
	await togglePlayerPresence({ data: { playerId: p.id, isPresent: false } });
	await expect(deletePlayer({ data: { playerId: p.id } })).rejects.toThrow(
		"absent",
	);
	expect(await db.select().from(matchParticipants)).toHaveLength(4);
	await score();
	await expect(deletePlayer({ data: { playerId: p.id } })).rejects.toThrow(
		"absent",
	);
	const fresh = await db
		.insert(players)
		.values({ firstname: "Nouveau" })
		.returning()
		.get();
	await deletePlayer({ data: { playerId: fresh.id } });
	expect(
		await db.select().from(players).where(eq(players.id, fresh.id)),
	).toEqual([]);
});
it("impossible generation leaves no partial data", async () => {
	await db.update(players).set({ present: false });
	await expect(startNextRound()).rejects.toThrow("assez");
	expect(await db.select().from(matches)).toEqual([]);
	expect((await settings())?.currentRound).toBe(0);
});
it("SQL failure during generation rolls back match, participants and counters", async () => {
	await db.$client.executeMultiple(
		`CREATE TRIGGER fail_participant BEFORE INSERT ON match_players BEGIN SELECT RAISE(ABORT, 'injected participant failure'); END;`,
	);
	try {
		await expect(startNextRound()).rejects.toThrow();
	} finally {
		await db.$client.execute("DROP TRIGGER fail_participant");
	}
	expect(await db.select().from(matches)).toEqual([]);
	expect(await db.select().from(matchParticipants)).toEqual([]);
	expect(
		(await db.select().from(players)).every((p) => p.playedGames === 0),
	).toBe(true);
	expect((await settings())?.currentRound).toBe(0);
});
it("SQL failure on the second team rolls back both scores and match status", async () => {
	await startNextRound();
	await db.$client.executeMultiple(
		`CREATE TRIGGER fail_score BEFORE UPDATE OF team_score ON match_players WHEN NEW.team=2 BEGIN SELECT RAISE(ABORT, 'injected score failure'); END;`,
	);
	try {
		await expect(score()).rejects.toThrow();
	} finally {
		await db.$client.execute("DROP TRIGGER fail_score");
	}
	expect((await currentMatch()).status).toBe("waiting");
	expect(
		(await db.select().from(matchParticipants)).every((p) => p.teamScore === 0),
	).toBe(true);
	expect(await getRankingData()).toEqual([]);
});
describe("score validation", () => {
	for (const value of [-1, 1.5, Number.NaN])
		it(`rejects ${value} without changing data`, async () => {
			await startNextRound();
			await expect(score(value, 0)).rejects.toThrow();
			expect((await currentMatch()).status).toBe("waiting");
			expect(await getRankingData()).toEqual([]);
		});
	it("allows a zero-zero draw and refuses nonexistent matches", async () => {
		await startNextRound();
		await score(0, 0);
		expect(
			(await getRankingData()).every(
				(p) => p.wins === 0 && p.losses === 0 && p.averageScore === 0,
			),
		).toBe(true);
		await expect(
			updateMatchScore({
				data: { matchId: 99999, scoreTeam1: 1, scoreTeam2: 0 },
			}),
		).rejects.toThrow("existe");
	});
});
it("repairs the affected legacy score cache from finished results", async () => {
	await startNextRound();
	await db.update(players).set({ totalScore: 999 });
	await score();
	expect(
		(await db.select().from(players)).every(
			(p) => p.totalScore === 21 || p.totalScore === 15,
		),
	).toBe(true);
});
it("a read can run while an independent transaction rolls back", async () => {
	await startNextRound();
	await score();
	const before = await getRankingData();
	let release: () => void = () => {};
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	let started: () => void = () => {};
	const ready = new Promise<void>((resolve) => {
		started = resolve;
	});
	const failing = db.transaction(async (tx) => {
		await tx.update(players).set({ firstname: "Uncommitted" });
		started();
		await gate;
		throw new Error("rollback requested");
	});
	const rejection = expect(failing).rejects.toThrow("rollback requested");
	await ready;
	try {
		expect(await getRankingData()).toEqual(before);
	} finally {
		release();
	}
	await rejection;
	expect(await getRankingData()).toEqual(before);
});

it("sorts close averages before rounding", async () => {
	const basePlayers = await db.select().from(players);
	const extras = await db
		.insert(players)
		.values([{ firstname: "Extra A" }, { firstname: "Extra B" }])
		.returning();
	const rounds = await db
		.insert(matches)
		.values(
			Array.from({ length: 202 }, (_, i) => ({
				roundNumber: i + 1,
				court: 1,
				status: "finished" as const,
			})),
		)
		.returning();
	await db.insert(matchParticipants).values(
		rounds.flatMap((match, i) => [
			{
				matchId: match.id,
				playerId: basePlayers[0].id,
				team: 1,
				teamScore: i === 0 ? 1 : 0,
			},
			{
				matchId: match.id,
				playerId: basePlayers[1].id,
				team: 1,
				teamScore: i === 0 ? 1 : 0,
			},
			{
				matchId: match.id,
				playerId: i === 201 ? extras[0].id : basePlayers[2].id,
				team: 2,
				teamScore: i === 0 ? 1 : 0,
			},
			{
				matchId: match.id,
				playerId: i === 201 ? extras[1].id : basePlayers[3].id,
				team: 2,
				teamScore: i === 0 ? 1 : 0,
			},
		]),
	);
	const ranking = await getRankingData();
	expect(ranking[0].id).toBe(basePlayers[2].id);
	expect(ranking[0].averageScore).toBe(1 / 201);
	expect(ranking[2].averageScore).toBe(1 / 202);
	expect(ranking.map((p) => p.ranking)).toEqual([1, 1, 3, 3, 5, 5]);
	// Both averages round to 0.00; they must nevertheless have different ranks.
	expect(ranking[0].averageScore.toFixed(2)).toBe(
		ranking[2].averageScore.toFixed(2),
	);
});
it("total points breaks exact average ties", async () => {
	await startNextRound();
	await score(10, 10);
	const first = await getRankingData();
	await togglePlayerPresence({
		data: { playerId: first[0].id, isPresent: false },
	});
	await togglePlayerPresence({
		data: { playerId: first[1].id, isPresent: false },
	});
	await db
		.insert(players)
		.values([{ firstname: "Substitute A" }, { firstname: "Substitute B" }]);
	await startNextRound();
	await score(10, 10);
	const ranked = await getRankingData();
	expect(ranked.map((p) => p.totalScore)).toEqual([20, 20, 10, 10, 10, 10]);
	expect(ranked.map((p) => p.ranking)).toEqual([1, 1, 3, 3, 3, 3]);
});
it("the final fixed round closes only when every court has a score", async () => {
	await db
		.update(tournamentSettings)
		.set({ roundType: "fixed", maxRounds: 1, availableCourts: 2 });
	await db
		.insert(players)
		.values(Array.from({ length: 4 }, (_, i) => ({ firstname: `Extra ${i}` })));
	await startNextRound();
	const round = await db.select().from(matches);
	await submitMatchScore({
		data: { matchId: round[0].id, scoreTeam1: 21, scoreTeam2: 0 },
	});
	expect((await settings())?.status).toBe("active");
	await expect(startNextRound()).rejects.toThrow("scores");
	await submitMatchScore({
		data: { matchId: round[1].id, scoreTeam1: 0, scoreTeam2: 21 },
	});
	expect((await settings())?.status).toBe("finished");
});
it("an invalid correction leaves the old result intact", async () => {
	await startNextRound();
	await score();
	const before = await getRankingData();
	await expect(
		updateMatchScore({
			data: {
				matchId: (await currentMatch()).id,
				scoreTeam1: 1.5,
				scoreTeam2: 0,
			},
		}),
	).rejects.toThrow();
	expect(await getRankingData()).toEqual(before);
});

describe("T2 integration", () => {
	it("counts only finished partnerships in current progress", async () => {
		await db.update(tournamentSettings).set({ roundType: "roundrobin" });
		expect(
			(await getCurrentRoundData()).roundRobinProgress?.completedPairs,
		).toBe(0);
		await startNextRound();
		expect(
			(await getCurrentRoundData()).roundRobinProgress?.completedPairs,
		).toBe(0);
		await score();
		const progress = (await getCurrentRoundData()).roundRobinProgress;
		expect(progress?.completedPairs).toBe(2);
		expect(progress?.populationSize).toBe(4);
		expect((await settings())?.status).toBe("active");
	});
	it("does not count absent historical pairs or close prematurely", async () => {
		const present = await db.select().from(players);
		const absent = await db
			.insert(players)
			.values(
				Array.from({ length: 4 }, (_, i) => ({
					firstname: `Absent ${i}`,
					present: false,
				})),
			)
			.returning();
		for (let r = 1; r <= 3; r++) {
			const match = await db
				.insert(matches)
				.values({ roundNumber: r, court: 1, status: "finished" })
				.returning()
				.get();
			await db.insert(matchParticipants).values([
				{ matchId: match.id, playerId: present[0].id, team: 1 },
				{ matchId: match.id, playerId: absent[r - 1].id, team: 1 },
				{ matchId: match.id, playerId: present[1].id, team: 2 },
				{ matchId: match.id, playerId: absent[r % 3].id, team: 2 },
			]);
		}
		await db
			.update(tournamentSettings)
			.set({ roundType: "roundrobin", currentRound: 3 });
		expect(
			(await getCurrentRoundData()).roundRobinProgress?.completedPairs,
		).toBe(0);
		await startNextRound();
		expect((await currentMatch()).roundNumber).toBe(4);
		expect((await settings())?.status).toBe("active");
		expect(await db.select().from(matchParticipants)).toHaveLength(16);
	});
	it("recalculates progress as players leave and return", async () => {
		await db.update(tournamentSettings).set({ roundType: "roundrobin" });
		await startNextRound();
		await score();
		const p = (await db.select().from(players))[0];
		await togglePlayerPresence({ data: { playerId: p.id, isPresent: false } });
		const away = (await getCurrentRoundData()).roundRobinProgress;
		expect(away?.populationSize).toBe(3);
		expect(away?.completedPairs).toBe(1);
		expect(away?.totalPairs).toBe(3);
		await togglePlayerPresence({ data: { playerId: p.id, isPresent: true } });
		expect(
			(await getCurrentRoundData()).roundRobinProgress?.completedPairs,
		).toBe(2);
		expect(await db.select().from(matchParticipants)).toHaveLength(4);
	});
	it("selects an arrival and excludes a departure from the next rotation", async () => {
		await startNextRound();
		await score();
		const old = (await db.select().from(players))[0];
		const newcomer = await db
			.insert(players)
			.values({ firstname: "Arrivée" })
			.returning()
			.get();
		await togglePlayerPresence({
			data: { playerId: old.id, isPresent: false },
		});
		await startNextRound();
		const current = await getCurrentRoundData();
		const ids = current.matches.flatMap((m) =>
			[...m.team1, ...m.team2].map((p) => p.playerId),
		);
		expect(ids).toContain(newcomer.id);
		expect(ids).not.toContain(old.id);
		expect(await getRankingData()).toHaveLength(4);
	});
	for (const roundType of ["infinite", "fixed", "roundrobin"] as const)
		it(`uses the mixed preference in ${roundType}`, async () => {
			await db
				.update(tournamentSettings)
				.set({ roundType, maximizeParity: true, maxRounds: 3 });
			const ps = await db.select().from(players);
			for (const p of ps.slice(2))
				await db
					.update(players)
					.set({ gender: "F" })
					.where(eq(players.id, p.id));
			await startNextRound();
			const participants = await db
				.select({ team: matchParticipants.team, gender: players.gender })
				.from(matchParticipants)
				.innerJoin(players, eq(players.id, matchParticipants.playerId));
			for (const team of [1, 2])
				expect(
					participants
						.filter((p) => p.team === team)
						.map((p) => p.gender)
						.sort(),
				).toEqual(["F", "M"]);
		});
	it("shows only remaining fixed rotations and never writes while forecasting", async () => {
		await db
			.update(tournamentSettings)
			.set({ roundType: "fixed", maxRounds: 5 });
		await startNextRound();
		await score();
		await startNextRound();
		async function snapshot() {
			return {
				players: await db.select().from(players),
				matches: await db.select().from(matches),
				participants: await db.select().from(matchParticipants),
				settings: await settings(),
			};
		}
		const before = await snapshot(),
			forecast = await getRoundRobinSchedule();
		expect(forecast.rounds.map((r) => r.roundNumber)).toEqual([3, 4, 5]);
		expect(forecast.remainingRounds).toBe(3);
		expect(await snapshot()).toEqual(before);
		// The first projected round is exactly what will be generated after scoring.
		await score();
		await startNextRound();
		const actual = await getCurrentRoundData();
		expect(
			actual.matches.map((m) => ({
				court: m.court,
				team1Ids: m.team1.map((p) => p.playerId),
				team2Ids: m.team2.map((p) => p.playerId),
			})),
		).toEqual(
			forecast.rounds[0].matches.map((m) => ({
				court: m.court,
				team1Ids: m.team1Ids,
				team2Ids: m.team2Ids,
			})),
		);
	});
	it("a planned final partnership is forecast, not actual completion", async () => {
		await db.update(tournamentSettings).set({ roundType: "roundrobin" });
		for (let i = 0; i < 2; i++) {
			await startNextRound();
			await score();
		}
		await startNextRound();
		const forecast = await getRoundRobinSchedule(),
			actual = await getCurrentRoundData();
		expect(forecast.coverageReached).toBe(true);
		expect(forecast.rounds).toEqual([]);
		expect(actual.roundRobinProgress?.completedPairs).toBe(4);
		expect(actual.roundRobinProgress?.complete).toBe(false);
		expect(actual.status).toBe("active");
		await expect(startNextRound()).rejects.toThrow("scores");
		await score();
		expect((await settings())?.status).toBe("finished");
	});
	it("does not close after a round without any new partnership", async () => {
		await db
			.insert(players)
			.values(
				Array.from({ length: 4 }, (_, i) => ({ firstname: `Extra ${i}` })),
			);
		await db
			.update(tournamentSettings)
			.set({ roundType: "roundrobin", availableCourts: 1 });
		for (let i = 0; i < 8; i++) {
			await startNextRound();
			await score();
		}
		const progress = (await getCurrentRoundData()).roundRobinProgress;
		expect(progress?.completedPairs).toBe(12);
		expect(progress?.totalPairs).toBe(28);
		expect((await settings())?.status).toBe("active");
		const forecast = await getRoundRobinSchedule();
		expect(forecast.partial).toBe(true);
		expect(forecast.coverageReached).toBe(false);
		expect(forecast.rounds).toHaveLength(forecast.simulationLimit);
		await finishTournament();
		expect((await settings())?.status).toBe("finished");
	});
	it("cannot finish vacuously after all players have left", async () => {
		await db.update(tournamentSettings).set({ roundType: "roundrobin" });
		await db.update(players).set({ present: false });
		await expect(startNextRound()).rejects.toThrow("assez");
		expect((await settings())?.status).toBe("active");
		expect((await getRoundRobinSchedule()).message).toContain("quatre");
		await finishTournament();
		expect((await settings())?.status).toBe("finished");
	});
});

it("T2 closes transactionally when departures complete the reference population", async () => {
	await db.update(tournamentSettings).set({ roundType: "roundrobin" });
	for (let i = 0; i < 2; i++) {
		await startNextRound();
		await score();
	}
	await startNextRound();
	const arrivals = await db
		.insert(players)
		.values([{ firstname: "Arrivée A" }, { firstname: "Arrivée B" }])
		.returning();
	await score();
	expect((await settings())?.status).toBe("active");
	for (const player of arrivals)
		await togglePlayerPresence({
			data: { playerId: player.id, isPresent: false },
		});
	expect((await getCurrentRoundData()).roundRobinProgress?.complete).toBe(true);
	expect((await settings())?.status).toBe("finished");
	await togglePlayerPresence({
		data: { playerId: arrivals[0].id, isPresent: true },
	});
	expect((await settings())?.status).toBe("finished");
});
