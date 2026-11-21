import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type PlayerInput = {
	id: number;
	firstname: string;
	lastname: string;
	gender: string | null;
	playedGames: number;
	present?: boolean;
};

export type MatchHistoryInput = {
	matchId: number;
	playerId: number;
	team: number;
	roundNumber: number;
	status: "waiting" | "finished";
};

export type GeneratedMatch = {
	roundNumber: number;
	court: number;
	team1Ids: number[];
	team2Ids: number[];
};

type Matrix = Map<string, number>;
type Composition = number[][]; // Each group is [teammate, teammate, opponent, opponent].
type Quality = number[];
const pairKey = (a: number, b: number) => `${Math.min(a, b)},${Math.max(a, b)}`;

function groupMatches(history: MatchHistoryInput[]) {
	const groups = new Map<number, MatchHistoryInput[]>();
	for (const row of history) {
		const group = groups.get(row.matchId) ?? [];
		group.push(row);
		groups.set(row.matchId, group);
	}
	return groups;
}

// Planned matches affect composition frequencies, but never completed coverage.
export function buildEncounterMatrices(history: MatchHistoryInput[]) {
	const partnerships: Matrix = new Map();
	const opponents: Matrix = new Map();
	const increment = (matrix: Matrix, a: number, b: number) => {
		const key = pairKey(a, b);
		matrix.set(key, (matrix.get(key) ?? 0) + 1);
	};
	for (const group of groupMatches(history).values()) {
		const first = group.filter((p) => p.team === 1);
		const second = group.filter((p) => p.team === 2);
		for (const team of [first, second]) {
			if (team.length === 2)
				increment(partnerships, team[0].playerId, team[1].playerId);
		}
		if (first.length === 2 && second.length === 2) {
			for (const a of first)
				for (const b of second) increment(opponents, a.playerId, b.playerId);
		}
	}
	return { partnerships, opponents };
}

export function buildPartnershipMatrix(history: MatchHistoryInput[]) {
	return buildEncounterMatrices(history).partnerships;
}

export function getCompletedPairsSet(
	history: MatchHistoryInput[],
	population?: number[],
) {
	const allowed = population ? new Set(population) : undefined;
	const completed = new Set<string>();
	for (const group of groupMatches(history).values()) {
		if (!group.every((p) => p.status === "finished")) continue;
		for (const teamNumber of [1, 2]) {
			const team = group.filter((p) => p.team === teamNumber);
			if (team.length !== 2 || team[0].playerId === team[1].playerId) continue;
			const [a, b] = team.map((p) => p.playerId);
			if (!allowed || (allowed.has(a) && allowed.has(b)))
				completed.add(pairKey(a, b));
		}
	}
	return completed;
}

export function getRoundRobinProgress(
	allPlayers: PlayerInput[],
	history: MatchHistoryInput[],
	maxCourts: number,
) {
	const population = [
		...new Set(allPlayers.filter((p) => p.present !== false).map((p) => p.id)),
	];
	const totalPairs = (population.length * (population.length - 1)) / 2;
	const completedPairs = getCompletedPairsSet(history, population).size;
	const remainingPairs = totalPairs - completedPairs;
	const matchesPerRound = Math.min(
		Math.floor(maxCourts),
		Math.floor(population.length / 4),
	);
	return {
		populationSize: population.length,
		totalPairs,
		completedPairs,
		remainingPairs,
		progress: totalPairs > 0 ? completedPairs / totalPairs : 0,
		// A lower bound, not a promise that the heuristic can achieve it.
		minimumRemainingRounds:
			matchesPerRound > 0
				? Math.ceil(remainingPairs / (matchesPerRound * 2))
				: null,
		// Avoid vacuous completion when there are too few players for a double.
		complete: population.length >= 4 && remainingPairs === 0,
	};
}

const compareNumbers = (a: number[], b: number[]) => {
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
	return 0;
};

function canonical(composition: Composition): Composition {
	return composition
		.map((match) => {
			const first = match.slice(0, 2).sort((a, b) => a - b);
			const second = match.slice(2).sort((a, b) => a - b);
			return first[0] < second[0]
				? [...first, ...second]
				: [...second, ...first];
		})
		.sort(compareNumbers);
}

/**
 * Strict lexicographic priorities: number of repeated partnerships, squared
 * partnership frequencies, then the same two opponent criteria, then non-mixed
 * teams. Squaring penalizes frequent repeats more strongly. Stable IDs break ties.
 * Selection fairness is decided before this comparison and cannot be traded away.
 */
function compositionScorer(
	history: MatchHistoryInput[],
	players: PlayerInput[],
	mixed: boolean,
) {
	const { partnerships, opponents } = buildEncounterMatrices(history);
	const genders = new Map(players.map((p) => [p.id, p.gender]));
	const nonMixed = (a: number, b: number) =>
		mixed &&
		!(
			(genders.get(a) === "M" && genders.get(b) === "F") ||
			(genders.get(a) === "F" && genders.get(b) === "M")
		)
			? 1
			: 0;
	const frequency = (matrix: Matrix, a: number, b: number) =>
		matrix.get(pairKey(a, b)) ?? 0;
	const score = (composition: Composition): Quality => {
		const quality = [0, 0, 0, 0, 0];
		for (const [a, b, c, d] of composition) {
			for (const [x, y] of [
				[a, b],
				[c, d],
			]) {
				const count = frequency(partnerships, x, y);
				quality[0] += Number(count > 0);
				quality[1] += count * count;
				quality[4] += nonMixed(x, y);
			}
			for (const [x, y] of [
				[a, c],
				[a, d],
				[b, c],
				[b, d],
			]) {
				const count = frequency(opponents, x, y);
				quality[2] += Number(count > 0);
				quality[3] += count * count;
			}
		}
		return quality;
	};
	return { score, frequency, partnerships, opponents, nonMixed };
}

function compose(
	selected: PlayerInput[],
	history: MatchHistoryInput[],
	mixed: boolean,
) {
	const ids = selected.map((p) => p.id).sort((a, b) => a - b);
	const { score, frequency, partnerships, opponents, nonMixed } =
		compositionScorer(history, selected, mixed);
	let best: Composition = [];
	let bestQuality: Quality | undefined;
	const consider = (candidate: Composition) => {
		const quality = score(candidate);
		if (bestQuality && compareNumbers(quality, bestQuality) > 0) return false;
		const normalized = canonical(candidate);
		if (
			!bestQuality ||
			compareNumbers(quality, bestQuality) < 0 ||
			compareNumbers(normalized.flat(), best.flat()) < 0
		) {
			best = normalized;
			bestQuality = quality;
			return true;
		}
		return false;
	};
	if (ids.length <= 8) {
		// Exactly 3 compositions for four players, 315 for eight: cheap global search.
		const enumerate = (remaining: number[], matches: Composition) => {
			if (remaining.length === 0) {
				consider(matches);
				return;
			}
			const a = remaining[0];
			for (let j = 1; j < remaining.length; j++) {
				for (let k = 1; k < remaining.length; k++) {
					if (k === j) continue;
					for (let l = k + 1; l < remaining.length; l++) {
						if (l === j) continue;
						const taken = new Set([0, j, k, l]);
						enumerate(
							remaining.filter((_, i) => !taken.has(i)),
							[...matches, [a, remaining[j], remaining[k], remaining[l]]],
						);
					}
				}
			}
		};
		enumerate(ids, []);
		return best;
	}

	// Larger fields: four deterministic greedy starts, then at most 600 local
	// exchanges each (3 passes). No global factorial search or optimality promise.
	for (let seed = 0; seed < 4; seed++) {
		const offset = Math.floor((ids.length * seed) / 4);
		const pool = [...ids.slice(offset), ...ids.slice(0, offset)];
		const teams: number[][] = [];
		while (pool.length > 0) {
			const a = pool.shift();
			if (a === undefined) break;
			pool.sort((b, c) => {
				const bc = frequency(partnerships, a, b),
					cc = frequency(partnerships, a, c);
				return bc - cc || nonMixed(a, b) - nonMixed(a, c) || b - c;
			});
			const b = pool.shift();
			if (b !== undefined) teams.push([a, b]);
		}
		const start: Composition = [];
		while (teams.length > 0) {
			const team = teams.shift();
			if (!team) break;
			const opposition = (other: number[]) => {
				const counts = team.flatMap((a) =>
					other.map((b) => frequency(opponents, a, b)),
				);
				return [
					counts.filter((n) => n > 0).length,
					counts.reduce((sum, n) => sum + n * n, 0),
				];
			};
			teams.sort(
				(a, b) =>
					compareNumbers(opposition(a), opposition(b)) || compareNumbers(a, b),
			);
			const other = teams.shift();
			if (other) start.push([...team, ...other]);
		}
		consider(start);
		let current = canonical(start);
		let budget = 600;
		for (let pass = 0; pass < 3 && budget > 0; pass++) {
			let next = current;
			let nextQuality = score(current);
			const trySwap = (candidate: Composition) => {
				budget--;
				const quality = score(candidate);
				if (compareNumbers(quality, nextQuality) < 0) {
					next = candidate;
					nextQuality = quality;
				}
			};
			// Exchange whole teams first: varies opponents without losing partners.
			for (let i = 0; i < ids.length / 2 && budget > 0; i++)
				for (let j = i + 1; j < ids.length / 2 && budget > 0; j++) {
					const flat = current.flat();
					[flat[2 * i], flat[2 * j]] = [flat[2 * j], flat[2 * i]];
					[flat[2 * i + 1], flat[2 * j + 1]] = [
						flat[2 * j + 1],
						flat[2 * i + 1],
					];
					trySwap(
						Array.from({ length: flat.length / 4 }, (_, k) =>
							flat.slice(4 * k, 4 * k + 4),
						),
					);
				}
			for (let i = 0; i < ids.length && budget > 0; i++)
				for (let j = i + 1; j < ids.length && budget > 0; j++) {
					const flat = current.flat();
					[flat[i], flat[j]] = [flat[j], flat[i]];
					trySwap(
						Array.from({ length: flat.length / 4 }, (_, k) =>
							flat.slice(4 * k, 4 * k + 4),
						),
					);
				}
			consider(next);
			if (next === current) break;
			current = canonical(next);
		}
	}
	return best;
}

export function generateRound(
	allPlayers: PlayerInput[],
	history: MatchHistoryInput[],
	maxCourts: number,
	nextRoundNumber: number,
	maximizeParity: boolean,
) {
	if (!Number.isInteger(maxCourts) || maxCourts < 1)
		throw new Error("Le nombre de terrains doit être un entier positif.");
	const present = allPlayers.filter((p) => p.present !== false);
	if (new Set(present.map((p) => p.id)).size !== present.length)
		throw new Error("La liste des joueurs contient des doublons.");
	const lastSelection = new Map<number, number>();
	for (const p of history)
		lastSelection.set(
			p.playerId,
			Math.max(lastSelection.get(p.playerId) ?? -1, p.roundNumber),
		);
	const sorted = [...present].sort(
		(a, b) =>
			a.playedGames - b.playedGames ||
			(lastSelection.get(a.id) ?? -1) - (lastSelection.get(b.id) ?? -1) ||
			a.id - b.id,
	);
	const count = Math.min(maxCourts, Math.floor(sorted.length / 4)) * 4;
	if (count < 4)
		throw new Error(
			"Il n'y a pas assez de joueurs présents pour remplir au moins 1 terrain !",
		);
	const composition = compose(sorted.slice(0, count), history, maximizeParity);
	return {
		matches: composition.map((group, index) => ({
			roundNumber: nextRoundNumber,
			court: index + 1,
			team1Ids: group.slice(0, 2),
			team2Ids: group.slice(2),
		})),
		restingPlayerIds: sorted.slice(count).map((p) => p.id),
	};
}

// All formats share selection, partner/opponent diversity and mixed preference.
export function generateRoundRobinRound(
	allPlayers: PlayerInput[],
	history: MatchHistoryInput[],
	maxCourts: number,
	nextRoundNumber: number,
	maximizeParity = false,
) {
	return generateRound(
		allPlayers,
		history,
		maxCourts,
		nextRoundNumber,
		maximizeParity,
	);
}
