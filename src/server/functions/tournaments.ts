import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import {
	matches,
	matchParticipants,
	players,
	tournamentSettings,
} from "#/db/schema";
import { simulateSchedule } from "#/lib/tournament-planning";
import { generateRound, getRoundRobinProgress } from "#/lib/utils";
import {
	closeCompletedTournament,
	readTournamentHistory,
	type TournamentTx,
} from "#/server/tournament-state";

export const updateAvailableCourts = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		z.object({ courts: z.number().min(1).max(10) }).parse(data),
	)
	.handler(async ({ data }) => {
		// On utilise un "upsert" (update ou insert si elle n'existe pas encore)
		await db
			.insert(tournamentSettings)
			.values({ id: 1, availableCourts: data.courts })
			.onConflictDoUpdate({
				target: tournamentSettings.id,
				set: { availableCourts: data.courts },
			});

		return { success: true };
	});

const scoreSchema = z.object({
	matchId: z.number().int().positive(),
	scoreTeam1: z.number().int().nonnegative(),
	scoreTeam2: z.number().int().nonnegative(),
});

async function assertNoWaitingMatches(tx: TournamentTx) {
	const waiting = await tx
		.select({ id: matches.id })
		.from(matches)
		.where(eq(matches.status, "waiting"))
		.get();
	if (waiting)
		throw new Error("Tous les scores doivent être saisis avant de continuer.");
}

export const startNextRound = createServerFn({ method: "POST" }).handler(
	async () => {
		return db.transaction(async (tx) => {
			await tx
				.insert(tournamentSettings)
				.values({ id: 1 })
				.onConflictDoNothing()
				.run();
			const settings = await tx
				.select()
				.from(tournamentSettings)
				.where(eq(tournamentSettings.id, 1))
				.get();
			if (!settings || settings.status === "finished") {
				throw new Error(
					"Le tournoi est terminé ! Impossible de générer un nouveau round.",
				);
			}
			await assertNoWaitingMatches(tx);
			// Also handles tournaments created before automatic closure was implemented.
			if (await closeCompletedTournament(tx))
				return { success: true, finished: true };

			const allPlayers = await tx
				.select()
				.from(players)
				.where(eq(players.present, true))
				.all();
			const history = await readTournamentHistory(tx);
			const lastMatch = await tx
				.select({ roundNumber: matches.roundNumber })
				.from(matches)
				.orderBy(desc(matches.roundNumber))
				.get();
			const nextRoundNumber = lastMatch ? lastMatch.roundNumber + 1 : 1;
			const result = generateRound(
				allPlayers,
				history,
				settings.availableCourts,
				nextRoundNumber,
				settings.maximizeParity,
			);
			if (result.matches.length === 0)
				throw new Error("Aucun match ne peut être généré.");

			for (const match of result.matches) {
				const inserted = await tx
					.insert(matches)
					.values({
						roundNumber: match.roundNumber,
						court: match.court,
						status: "waiting",
					})
					.returning({ id: matches.id })
					.get();
				await tx
					.insert(matchParticipants)
					.values([
						...match.team1Ids.map((playerId) => ({
							matchId: inserted.id,
							playerId,
							team: 1,
						})),
						...match.team2Ids.map((playerId) => ({
							matchId: inserted.id,
							playerId,
							team: 2,
						})),
					])
					.run();
				for (const playerId of [...match.team1Ids, ...match.team2Ids]) {
					await tx
						.update(players)
						.set({ playedGames: sql`${players.playedGames} + 1` })
						.where(eq(players.id, playerId))
						.run();
				}
			}
			await tx
				.update(tournamentSettings)
				.set({ currentRound: nextRoundNumber })
				.where(eq(tournamentSettings.id, 1))
				.run();
			return { success: true, round: nextRoundNumber };
		});
	},
);

async function saveScore(
	data: z.infer<typeof scoreSchema>,
	correction: boolean,
) {
	return db.transaction(async (tx) => {
		const match = await tx
			.select()
			.from(matches)
			.where(eq(matches.id, data.matchId))
			.get();
		if (!match) throw new Error("Ce match n'existe pas.");
		if (correction && match.status !== "finished") {
			throw new Error(
				"Ce match est en attente : utilisez la saisie normale du score.",
			);
		}
		if (!correction && match.status !== "waiting") {
			throw new Error(
				"Le score de ce match a déjà été validé. Utilisez la correction.",
			);
		}
		const participants = await tx
			.select()
			.from(matchParticipants)
			.where(eq(matchParticipants.matchId, match.id))
			.all();
		if (
			participants.length !== 4 ||
			new Set(participants.map((p) => p.playerId)).size !== 4 ||
			participants.filter((p) => p.team === 1).length !== 2 ||
			participants.filter((p) => p.team === 2).length !== 2
		) {
			throw new Error(
				"Les participants de ce match sont incomplets ou incohérents.",
			);
		}
		// Conditional transition protects first validation independently of the UI.
		if (!correction) {
			const changed = await tx
				.update(matches)
				.set({ status: "finished" })
				.where(and(eq(matches.id, match.id), eq(matches.status, "waiting")))
				.returning({ id: matches.id })
				.all();
			if (changed.length !== 1)
				throw new Error("Le score de ce match a déjà été validé.");
		}
		for (const [team, score] of [
			[1, data.scoreTeam1],
			[2, data.scoreTeam2],
		]) {
			await tx
				.update(matchParticipants)
				.set({ teamScore: score })
				.where(
					and(
						eq(matchParticipants.matchId, match.id),
						eq(matchParticipants.team, team),
					),
				)
				.run();
		}
		// Refresh the legacy cache from the source of truth. Replacing a score has
		// only its net effect and also repairs any pre-existing double-counted cache.
		for (const p of participants) {
			await tx
				.update(players)
				.set({
					totalScore: sql<number>`(
				select coalesce(sum(mp.team_score), 0) from match_players mp
				join matches m on m.id = mp.match_id
				where mp.player_id = ${p.playerId} and m.status = 'finished'
			)`,
				})
				.where(eq(players.id, p.playerId))
				.run();
		}
		if (!correction) await closeCompletedTournament(tx);
		return { success: true };
	});
}

export const submitMatchScore = createServerFn({ method: "POST" })
	.inputValidator(scoreSchema)
	.handler(({ data }) => saveScore(data, false));

export const updateMatchScore = createServerFn({ method: "POST" })
	.inputValidator(scoreSchema)
	.handler(({ data }) => saveScore(data, true));

export const getCurrentRoundData = createServerFn({ method: "GET" }).handler(
	async () => {
		// 1. On récupère TOUTE la ligne de configuration globale
		const settings = await db
			.select()
			.from(tournamentSettings)
			.where(eq(tournamentSettings.id, 1))
			.get();

		const currentRound = settings ? settings.currentRound : 0;
		const availableCourts = settings ? settings.availableCourts : 4;
		const roundType = settings ? settings.roundType : "infinite";
		const maxRounds = settings ? (settings.maxRounds ?? 0) : 0;
		const maximizeParity = settings ? settings.maximizeParity : false;
		const status = settings ? settings.status : "active";

		// Calculer la progression round-robin si ce mode est actif
		let roundRobinProgress = null;
		if (roundType === "roundrobin") {
			const allPlayers = await db
				.select({
					id: players.id,
					firstname: players.firstname,
					lastname: players.lastname,
					gender: players.gender,
					playedGames: players.playedGames,
				})
				.from(players)
				.where(eq(players.present, true))
				.all();

			const globalHistory = await readTournamentHistory(db);

			roundRobinProgress = getRoundRobinProgress(
				allPlayers,
				globalHistory,
				availableCourts,
			);
		}

		// Si aucun match n'a encore été lancé, on renvoie déjà les réglages globaux
		if (currentRound === 0) {
			return {
				currentRound,
				availableCourts,
				roundType,
				maxRounds,
				maximizeParity,
				status,
				matches: [],
				restingPlayers: [],
				roundRobinProgress,
			};
		}

		// 2. On récupère tous les matchs de ce round
		const roundMatches = await db
			.select()
			.from(matches)
			.where(eq(matches.roundNumber, currentRound))
			.orderBy(matches.court)
			.all();

		// 3. Pour chaque match, on va chercher les joueurs et leurs équipes
		const matchesWithPlayers = [];
		for (const match of roundMatches) {
			const participants = await db
				.select({
					team: matchParticipants.team,
					teamScore: matchParticipants.teamScore,
					playerId: players.id,
					firstname: players.firstname,
					lastname: players.lastname,
				})
				.from(matchParticipants)
				.innerJoin(players, eq(matchParticipants.playerId, players.id))
				.where(eq(matchParticipants.matchId, match.id))
				.all();

			const team1 = participants.filter((p) => p.team === 1);
			const team2 = participants.filter((p) => p.team === 2);

			matchesWithPlayers.push({
				id: match.id,
				court: match.court,
				status: match.status,
				team1,
				team2,
			});
		}

		// 4. Trouver les joueurs qui sont au repos
		const allPresentPlayers = await db
			.select()
			.from(players)
			.where(eq(players.present, true))
			.all();
		const activePlayerIds = new Set(
			matchesWithPlayers.flatMap((m) => [
				...m.team1.map((p) => p.playerId),
				...m.team2.map((p) => p.playerId),
			]),
		);
		const restingPlayers = allPresentPlayers.filter(
			(p) => !activePlayerIds.has(p.id),
		);

		// On retourne l'objet enrichi
		return {
			currentRound,
			availableCourts,
			roundType,
			maxRounds,
			maximizeParity,
			status,
			matches: matchesWithPlayers,
			restingPlayers,
			roundRobinProgress,
		};
	},
);

export const getRoundRobinSchedule = createServerFn({ method: "GET" }).handler(
	async () => {
		const settings = await db
			.select()
			.from(tournamentSettings)
			.where(eq(tournamentSettings.id, 1))
			.get();
		const allPlayers = await db
			.select()
			.from(players)
			.where(eq(players.present, true))
			.all();
		const history = await readTournamentHistory(db);
		return simulateSchedule({
			players: allPlayers,
			history,
			availableCourts: settings?.availableCourts ?? 4,
			currentRound: history.reduce(
				(max, row) => Math.max(max, row.roundNumber),
				settings?.currentRound ?? 0,
			),
			roundType: settings?.roundType ?? "infinite",
			maxRounds: settings?.maxRounds ?? 0,
			maximizeParity: settings?.maximizeParity ?? false,
			status: settings?.status ?? "active",
		});
	},
);

export const getMatchHistory = createServerFn({ method: "GET" }).handler(
	async () => {
		const allMatches = await db
			.select({
				id: matches.id,
				roundNumber: matches.roundNumber,
				court: matches.court,
				status: matches.status,
			})
			.from(matches)
			.orderBy(matches.roundNumber, matches.court)
			.all();

		const historyByRound: Record<
			number,
			Array<{
				id: number;
				court: number;
				status: "waiting" | "finished";
				team1: Array<{
					playerId: number;
					firstname: string;
					lastname: string;
					teamScore: number;
				}>;
				team2: Array<{
					playerId: number;
					firstname: string;
					lastname: string;
					teamScore: number;
				}>;
			}>
		> = {};

		for (const match of allMatches) {
			const participants = await db
				.select({
					team: matchParticipants.team,
					teamScore: matchParticipants.teamScore,
					playerId: players.id,
					firstname: players.firstname,
					lastname: players.lastname,
				})
				.from(matchParticipants)
				.innerJoin(players, eq(matchParticipants.playerId, players.id))
				.where(eq(matchParticipants.matchId, match.id))
				.all();

			if (!historyByRound[match.roundNumber]) {
				historyByRound[match.roundNumber] = [];
			}

			historyByRound[match.roundNumber].push({
				id: match.id,
				court: match.court,
				status: match.status,
				team1: participants
					.filter((p) => p.team === 1)
					.map((p) => ({
						playerId: p.playerId,
						firstname: p.firstname,
						lastname: p.lastname,
						teamScore: p.teamScore,
					})),
				team2: participants
					.filter((p) => p.team === 2)
					.map((p) => ({
						playerId: p.playerId,
						firstname: p.firstname,
						lastname: p.lastname,
						teamScore: p.teamScore,
					})),
			});
		}

		return Object.entries(historyByRound)
			.map(([round, matches]) => ({
				round: Number(round),
				matches,
			}))
			.sort((a, b) => a.round - b.round);
	},
);

async function readRanking() {
	// One statement gives a consistent snapshot, without a write transaction.
	const rows = await db
		.select({
			id: players.id,
			firstname: players.firstname,
			lastname: players.lastname,
			matchId: matches.id,
			team: matchParticipants.team,
			score: matchParticipants.teamScore,
		})
		.from(matches)
		.innerJoin(matchParticipants, eq(matches.id, matchParticipants.matchId))
		.innerJoin(players, eq(players.id, matchParticipants.playerId))
		.where(eq(matches.status, "finished"))
		.all();
	const byMatch = new Map<number, typeof rows>();
	for (const row of rows) {
		const group = byMatch.get(row.matchId) ?? [];
		group.push(row);
		byMatch.set(row.matchId, group);
	}
	type Entry = {
		id: number;
		firstname: string;
		lastname: string;
		playedGames: number;
		wins: number;
		losses: number;
		totalScore: number;
		averageScore: number;
	};
	const entries = new Map<number, Entry>();
	for (const group of byMatch.values()) {
		const s1 = group.find((p) => p.team === 1)?.score ?? 0;
		const s2 = group.find((p) => p.team === 2)?.score ?? 0;
		for (const row of group) {
			const entry = entries.get(row.id) ?? {
				id: row.id,
				firstname: row.firstname,
				lastname: row.lastname,
				playedGames: 0,
				wins: 0,
				losses: 0,
				totalScore: 0,
				averageScore: 0,
			};
			entry.playedGames++;
			entry.totalScore += row.score;
			const opponentScore = row.team === 1 ? s2 : s1;
			if (row.score > opponentScore) entry.wins++;
			if (row.score < opponentScore) entry.losses++;
			entry.averageScore = entry.totalScore / entry.playedGames;
			entries.set(row.id, entry);
		}
	}
	// Compare integer ratios before formatting averages, including exact ties.
	const compare = (a: Entry, b: Entry) => {
		const left = BigInt(a.totalScore) * BigInt(b.playedGames);
		const right = BigInt(b.totalScore) * BigInt(a.playedGames);
		return left === right ? b.totalScore - a.totalScore : left > right ? -1 : 1;
	};
	const sorted = [...entries.values()].sort(compare);
	let ranking = 0;
	return sorted.map((entry, index) => {
		if (index === 0 || compare(sorted[index - 1], entry) !== 0)
			ranking = index + 1;
		return { ...entry, ranking };
	});
}

export const getRankingData = createServerFn({ method: "GET" }).handler(
	readRanking,
);
export const getLeaderBoard = createServerFn({ method: "GET" }).handler(
	readRanking,
);

export const finishTournament = createServerFn({ method: "POST" }).handler(
	async () => {
		return db.transaction(async (tx) => {
			await assertNoWaitingMatches(tx);
			await tx
				.insert(tournamentSettings)
				.values({ id: 1, status: "finished" })
				.onConflictDoUpdate({
					target: tournamentSettings.id,
					set: { status: "finished" },
				})
				.run();
			return { success: true };
		});
	},
);

// 1. SAUVEGARDER LES RÉGLAGES
export const updateTournamentSettings = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			roundType: z.enum(["infinite", "fixed", "roundrobin"]),
			maxRounds: z.number().min(0),
			maximizeParity: z.boolean(),
			availableCourts: z.number().min(1),
		}),
	)
	.handler(async ({ data }) => {
		await db
			.insert(tournamentSettings)
			.values({ id: 1, ...data, currentRound: 0, status: "active" })
			.onConflictDoUpdate({
				target: tournamentSettings.id,
				set: data,
			});
		return { success: true };
	});

// 2. RÉINITIALISER LE TOURNOI (Sécurisé par transaction)
export const resetTournament = createServerFn({ method: "POST" }).handler(
	async () => {
		return await db.transaction(async (tx) => {
			// A. On nettoie tout l'historique des matchs
			await tx.delete(matchParticipants).run();
			await tx.delete(matches).run();

			// B. On remet à zéro les statistiques des joueurs (mais on les garde inscrits !)
			await tx.update(players).set({ totalScore: 0, playedGames: 0 }).run();

			// C. On réinitialise la configuration globale au Round 0
			await tx
				.update(tournamentSettings)
				.set({
					currentRound: 0,
					status: "active",
					roundType: "infinite",
					maxRounds: 0,
				})
				.where(eq(tournamentSettings.id, 1))
				.run();

			return { success: true };
		});
	},
);
