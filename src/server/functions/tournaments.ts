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
import {
	generateRound,
	generateRoundRobinRound,
	getCompletedPairsSet,
	getRoundRobinProgress,
} from "#/lib/utils";

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

export const getLeaderBoard = createServerFn({ method: "GET" }).handler(
	async () => {
		const leaderBoard = await db
			.select({
				id: players.id,
				firstname: players.firstname,
				lastname: players.lastname,
				playedGames: players.playedGames,
				totalScore: players.totalScore,
				// SQL custom sir le joueur a joué plus de 0 matchs, on divise son score total par son nombre de matchs.
				// on transforme le résultat en nombre à virgule (REAL)
				averageScore: sql<number>`
CASE 
WHEN ${players.playedGames} > 0 THEN CAST(${players.totalScore} AS REAL) / ${players.playedGames}
ELSE 0
END
       `.as("average_score"),
			})
			.from(players)
			.where(eq(players.present, true))
			// Tri principal: la plus grosse moyenne d'abord (DESC = décroissant)
			// Tri secondaire en cas d'égalité: le plus gros scrore total
			.orderBy(sql`average_score DESC`, players.totalScore);

		return leaderBoard;
	},
);

export const startNextRound = createServerFn({ method: "POST" }).handler(
	async () => {
		return await db.transaction(async (tx) => {
			const settings = await tx
				.select({
					availableCourts: tournamentSettings.availableCourts,
					roundType: tournamentSettings.roundType,
					maxRounds: tournamentSettings.maxRounds,
					status: tournamentSettings.status,
					maximizeParity: tournamentSettings.maximizeParity,
				})
				.from(tournamentSettings)
				.where(eq(tournamentSettings.id, 1))
				.get();

			const maxCourts = settings ? settings.availableCourts : 4;
			const roundType = settings ? settings.roundType : "infinite";
			const maxRounds = settings ? (settings.maxRounds ?? 0) : 0;
			const maximizeParity = settings ? settings.maximizeParity : false;

			if (settings && settings.status === "finished") {
				throw new Error(
					"Le tournoi est terminé ! Impossible de générer un nouveau round.",
				);
			}

			// 2. Récupérer tous les joueurs présents (.all() au lieu de await)
			const allPlayers = await tx
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

			// 3. Récupérer tout l'historique (.all())
			const globalHistory = await tx
				.select({
					matchId: matchParticipants.matchId,
					playerId: matchParticipants.playerId,
					team: matchParticipants.team,
				})
				.from(matchParticipants)
				.all();

			// 4. Trouver le numéro du round actuel (.get())
			const lastMatch = await tx
				.select({ roundNumber: matches.roundNumber })
				.from(matches)
				.orderBy(desc(matches.roundNumber))
				.get();

			const nextRoundNumber = lastMatch ? lastMatch.roundNumber + 1 : 1;

			// SÉCURITÉ B : Si on est en mode "Fixe" et qu'on dépasse la limite configurée
			if (roundType === "fixed" && nextRoundNumber > maxRounds) {
				await tx.update(tournamentSettings)
					.set({ status: "finished" })
					.where(eq(tournamentSettings.id, 1))
					.run();
				return { success: true, finished: true };
			}

			// SÉCURITÉ C : Mode "Round-Robin" — vérifier si toutes les paires sont complétées
			if (roundType === "roundrobin") {
				const completedPairs = getCompletedPairsSet(globalHistory);
				const totalPairs =
					(allPlayers.length * (allPlayers.length - 1)) / 2;

				if (completedPairs.size >= totalPairs) {
					await tx.update(tournamentSettings)
						.set({ status: "finished" })
						.where(eq(tournamentSettings.id, 1))
						.run();
					return { success: true, finished: true };
				}

				const { matches: newMatches } = generateRoundRobinRound(
					allPlayers,
					globalHistory,
					maxCourts,
					nextRoundNumber,
				);

				for (const matchData of newMatches) {
				const insertedMatch = await tx
					.insert(matches)
					.values({
						roundNumber: matchData.roundNumber,
						court: matchData.court,
						status: "waiting",
					})
					.returning({ id: matches.id })
					.get();

				const participantsValues = [
					...matchData.team1Ids.map((pId) => ({
						matchId: insertedMatch.id,
						playerId: pId,
						team: 1,
					})),
					...matchData.team2Ids.map((pId) => ({
						matchId: insertedMatch.id,
						playerId: pId,
						team: 2,
					})),
				];

				// On ins
				await tx.insert(matchParticipants).values(participantsValues).run();

				// Augmenter le compteur de matchs des joueurs actifs
				const activePlayerIds = [...matchData.team1Ids, ...matchData.team2Ids];
				for (const pId of activePlayerIds) {
					const player = await tx
						.select({ playedGames: players.playedGames })
						.from(players)
						.where(eq(players.id, pId))
						.get();
					const currentGames = player ? player.playedGames : 0;

						await tx.update(players)
							.set({ playedGames: currentGames + 1 })
							.where(eq(players.id, pId))
							.run();
					}
				}

				await tx.insert(tournamentSettings)
					.values({ id: 1, currentRound: nextRoundNumber })
					.onConflictDoUpdate({
						target: tournamentSettings.id,
						set: { currentRound: nextRoundNumber },
					})
					.run();

				return { success: true, round: nextRoundNumber };
			}

			// 5. Lancer l'algorithme pur (Lui, il est déjà synchrone, donc aucun changement)
			const { matches: newMatches } = generateRound(
				allPlayers,
				globalHistory,
				maxCourts,
				nextRoundNumber,
				maximizeParity,
			);

			// 6. Enregistrer chaque match en base de données de manière synchrone
			for (const matchData of newMatches) {
				const insertedMatch = tx
					.insert(matches)
					.values({
						roundNumber: matchData.roundNumber,
						court: matchData.court,
						status: "waiting",
					})
					.returning({ id: matches.id })
					.get();

				// Préparer les lignes des participants
				const participantsValues = [
					...matchData.team1Ids.map((pId) => ({
						matchId: insertedMatch.id,
						playerId: pId,
						team: 1,
					})),
					...matchData.team2Ids.map((pId) => ({
						matchId: insertedMatch.id,
						playerId: pId,
						team: 2,
					})),
				];

				// On ins
				await tx.insert(matchParticipants).values(participantsValues).run();

				// Augmenter le compteur de matchs des joueurs actifs
				const activePlayerIds = [...matchData.team1Ids, ...matchData.team2Ids];
				for (const pId of activePlayerIds) {
					const player = tx
						.select({ playedGames: players.playedGames })
						.from(players)
						.where(eq(players.id, pId))
						.get();
					const currentGames = player ? player.playedGames : 0;

					await tx.update(players)
						.set({ playedGames: currentGames + 1 })
						.where(eq(players.id, pId))
						.run();
				}
			}

			// Mettre à jour le round global dans la config
			await tx.insert(tournamentSettings)
				.values({ id: 1, currentRound: nextRoundNumber })
				.onConflictDoUpdate({
					target: tournamentSettings.id,
					set: { currentRound: nextRoundNumber },
				})
				.run();

			return { success: true, round: nextRoundNumber };
		});
	},
);
// 2. ACTION POUR ENREGISTRER LE SCORE D'UN MATCH
export const submitMatchScore = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			matchId: z.number(),
			scoreTeam1: z.number().min(0),
			scoreTeam2: z.number().min(0),
		}),
	)
	.handler(async ({ data }) => {
		const { matchId, scoreTeam1, scoreTeam2 } = data;

		// La fonction principale reste async, mais Drizzle s'exécute de manière synchrone à l'intérieur
		return await db.transaction(async (tx) => {
			// A. Clôturer le match (.run() remplace await ... )
			await tx.update(matches)
				.set({ status: "finished" })
				.where(eq(matches.id, matchId))
				.run();

			// B. Enregistrer les scores de la Team 1 (.run())
			await tx.update(matchParticipants)
				.set({ teamScore: scoreTeam1 })
				.where(
					and(
						eq(matchParticipants.matchId, matchId),
						eq(matchParticipants.team, 1),
					),
				)
				.run();

			// Enregistrer les scores de la Team 2 (.run())
			await tx.update(matchParticipants)
				.set({ teamScore: scoreTeam2 })
				.where(
					and(
						eq(matchParticipants.matchId, matchId),
						eq(matchParticipants.team, 2),
					),
				)
				.run();

			// C. Récupérer les joueurs du match pour impacter leur classement (.all())
			const participants = await tx
				.select({
					playerId: matchParticipants.playerId,
					team: matchParticipants.team,
				})
				.from(matchParticipants)
				.where(eq(matchParticipants.matchId, matchId))
				.all();

			// Boucle synchrone sur les participants
			for (const p of participants) {
				const pointsMarques = p.team === 1 ? scoreTeam1 : scoreTeam2;

				// Récupérer le score act
				const player = await tx
					.select({ totalScore: players.totalScore })
					.from(players)
					.where(eq(players.id, p.playerId))
					.get();

				const currentTotalScore = player ? player.totalScore : 0;

				// Mettre à jour le score global (.run())
				await tx.update(players)
					.set({ totalScore: currentTotalScore + pointsMarques })
					.where(eq(players.id, p.playerId))
					.run();
			}

			return { success: true };
		});
	});

export const updateMatchScore = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			matchId: z.number(),
			scoreTeam1: z.number().min(0),
			scoreTeam2: z.number().min(0),
		}),
	)
	.handler(async ({ data }) => {
		const { matchId, scoreTeam1, scoreTeam2 } = data;

		return await db.transaction(async (tx) => {
			const oldParticipants = await tx
				.select({
					playerId: matchParticipants.playerId,
					team: matchParticipants.team,
					teamScore: matchParticipants.teamScore,
				})
				.from(matchParticipants)
				.where(eq(matchParticipants.matchId, matchId))
				.all();

			for (const p of oldParticipants) {
				const oldScore = p.teamScore;
				const player = await tx
					.select({ totalScore: players.totalScore })
					.from(players)
					.where(eq(players.id, p.playerId))
					.get();
				const currentTotal = player ? player.totalScore : 0;
				await tx.update(players)
					.set({ totalScore: Math.max(0, currentTotal - oldScore) })
					.where(eq(players.id, p.playerId))
					.run();
			}

			await tx.update(matchParticipants)
				.set({ teamScore: scoreTeam1 })
				.where(
					and(
						eq(matchParticipants.matchId, matchId),
						eq(matchParticipants.team, 1),
					),
				)
				.run();

			await tx.update(matchParticipants)
				.set({ teamScore: scoreTeam2 })
				.where(
					and(
						eq(matchParticipants.matchId, matchId),
						eq(matchParticipants.team, 2),
					),
				)
				.run();

			const participants = await tx
				.select({
					playerId: matchParticipants.playerId,
					team: matchParticipants.team,
				})
				.from(matchParticipants)
				.where(eq(matchParticipants.matchId, matchId))
				.all();

			for (const p of participants) {
				const pointsMarques = p.team === 1 ? scoreTeam1 : scoreTeam2;
				const player = await tx
					.select({ totalScore: players.totalScore })
					.from(players)
					.where(eq(players.id, p.playerId))
					.get();
				const currentTotalScore = player ? player.totalScore : 0;
				await tx.update(players)
					.set({ totalScore: currentTotalScore + pointsMarques })
					.where(eq(players.id, p.playerId))
					.run();
			}

			return { success: true };
		});
	});

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

			const globalHistory = await db
				.select({
					matchId: matchParticipants.matchId,
					playerId: matchParticipants.playerId,
					team: matchParticipants.team,
				})
				.from(matchParticipants)
				.all();

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

		if (!settings || settings.roundType === "infinite") {
			return { rounds: [] };
		}

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

		const globalHistory = await db
			.select({
				matchId: matchParticipants.matchId,
				playerId: matchParticipants.playerId,
				team: matchParticipants.team,
			})
			.from(matchParticipants)
			.all();

		const lastMatch = await db
			.select({ roundNumber: matches.roundNumber })
			.from(matches)
			.orderBy(desc(matches.roundNumber))
			.get();

		const nextRoundNumber = lastMatch ? lastMatch.roundNumber + 1 : 1;
		const maxCourts = settings?.availableCourts ?? 4;
		const maximizeParity = settings?.maximizeParity ?? false;
		const roundType = settings.roundType;
		const maxRounds = settings.maxRounds ?? 0;

		const completedPairs = getCompletedPairsSet(globalHistory);
		const totalPairs = (allPlayers.length * (allPlayers.length - 1)) / 2;

		if (roundType === "roundrobin" && completedPairs.size >= totalPairs) {
			return { rounds: [], completed: true };
		}

		const simRounds: Array<{
			roundNumber: number;
			remainingPairs: number;
			teams: Array<{
				player1: { id: number; firstname: string; lastname: string };
				player2: { id: number; firstname: string; lastname: string };
			}>;
		}> = [];

		const simPlayers = allPlayers.map((p) => ({ ...p }));
		let simHistory = [...globalHistory];
		let simRound = nextRoundNumber;
		let lastCompletedCount = -1;
		const maxIterations = totalPairs * 2;

		for (let iter = 0; iter < maxIterations; iter++) {
			if (roundType === "fixed" && simRounds.length >= maxRounds) break;

			if (roundType === "roundrobin") {
				const currentCompleted = getCompletedPairsSet(simHistory);
				if (currentCompleted.size >= totalPairs) break;
				const currentCount = currentCompleted.size;
				if (currentCount === lastCompletedCount) break;
				lastCompletedCount = currentCount;
			}

			try {
				const result =
					roundType === "roundrobin"
						? generateRoundRobinRound(
								simPlayers,
								simHistory,
								maxCourts,
								simRound,
							)
						: generateRound(
								simPlayers,
								simHistory,
								maxCourts,
								simRound,
								maximizeParity,
							);

				const teams = result.matches.flatMap((m) => {
					const p1 = simPlayers.find((p) => p.id === m.team1Ids[0])!;
					const p2 = simPlayers.find((p) => p.id === m.team1Ids[1])!;
					const p3 = simPlayers.find((p) => p.id === m.team2Ids[0])!;
					const p4 = simPlayers.find((p) => p.id === m.team2Ids[1])!;
					return [
						{ player1: { id: p1.id, firstname: p1.firstname, lastname: p1.lastname }, player2: { id: p2.id, firstname: p2.firstname, lastname: p2.lastname } },
						{ player1: { id: p3.id, firstname: p3.firstname, lastname: p3.lastname }, player2: { id: p4.id, firstname: p4.firstname, lastname: p4.lastname } },
					];
				});

				const remainingPairs = roundType === "roundrobin"
					? totalPairs - getCompletedPairsSet(simHistory).size
					: maxRounds - (simRounds.length + 1);

				simRounds.push({
					roundNumber: simRound,
					remainingPairs,
					teams,
				});

				const allPlayedIds = new Set(
					result.matches.flatMap((m) => [...m.team1Ids, ...m.team2Ids]),
				);
				for (const p of simPlayers) {
					if (allPlayedIds.has(p.id)) {
						p.playedGames++;
					}
				}

				simHistory = [
					...simHistory,
					...result.matches.flatMap((m, matchIdx) => [
						...(m.team1Ids.map((pid) => ({
							matchId: -(simRound * 10 + matchIdx),
							playerId: pid,
							team: 1 as const,
						}))),
						...(m.team2Ids.map((pid) => ({
							matchId: -(simRound * 10 + matchIdx),
							playerId: pid,
							team: 2 as const,
						}))),
					]),
				];

				simRound++;
			} catch {
				break;
			}
		}

		return { rounds: simRounds, completed: roundType === "fixed" && simRounds.length >= maxRounds };
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

export const getRankingData = createServerFn({ method: "GET" }).handler(
	async () => {
		return await db.transaction(async (tx) => {
			const allPlayers = await tx
				.select({
					id: players.id,
					firstname: players.firstname,
					lastname: players.lastname,
					playedGames: players.playedGames,
					totalScore: players.totalScore,
				})
				.from(players)
				.where(eq(players.present, true))
				.all();

			const finishedParticipants = await tx
				.select({
					matchId: matches.id,
					playerId: matchParticipants.playerId,
					team: matchParticipants.team,
					teamScore: matchParticipants.teamScore,
				})
				.from(matches)
				.innerJoin(
					matchParticipants,
					eq(matches.id, matchParticipants.matchId),
				)
				.where(eq(matches.status, "finished"))
				.all();

			const matchMap = new Map<
				number,
				Array<{ playerId: number; team: number; teamScore: number }>
			>();
			for (const row of finishedParticipants) {
				if (!matchMap.has(row.matchId))
					matchMap.set(row.matchId, []);
				matchMap.get(row.matchId)!.push(row);
			}

			const winsMap = new Map<number, number>();
			const lossesMap = new Map<number, number>();
			for (const [, participants] of matchMap) {
				const t1 = participants.filter((p) => p.team === 1);
				const t2 = participants.filter((p) => p.team === 2);
				const s1 = t1[0]?.teamScore ?? 0;
				const s2 = t2[0]?.teamScore ?? 0;
				for (const p of t1) {
					if (s1 > s2)
						winsMap.set(p.playerId, (winsMap.get(p.playerId) ?? 0) + 1);
					else if (s1 < s2)
						lossesMap.set(
							p.playerId,
							(lossesMap.get(p.playerId) ?? 0) + 1,
						);
				}
				for (const p of t2) {
					if (s2 > s1)
						winsMap.set(p.playerId, (winsMap.get(p.playerId) ?? 0) + 1);
					else if (s2 < s1)
						lossesMap.set(
							p.playerId,
							(lossesMap.get(p.playerId) ?? 0) + 1,
						);
				}
			}

			const ranking = allPlayers
				.map((p) => ({
					id: p.id,
					firstname: p.firstname,
					lastname: p.lastname,
					playedGames: p.playedGames,
					wins: winsMap.get(p.id) ?? 0,
					losses: lossesMap.get(p.id) ?? 0,
					totalScore: p.totalScore,
					averageScore:
						p.playedGames > 0
							? Math.round((p.totalScore / p.playedGames) * 100) / 100
							: 0,
				}))
				.sort((a, b) => {
					if (b.averageScore !== a.averageScore)
						return b.averageScore - a.averageScore;
					return b.totalScore - a.totalScore;
				})
				.map((p, i) => ({ ...p, ranking: i + 1 }));

			return ranking;
		});
	},
);

export const finishTournament = createServerFn({ method: "POST" }).handler(
	async () => {
		await db
			.update(tournamentSettings)
			.set({ status: "finished" })
			.where(eq(tournamentSettings.id, 1));
		return { success: true };
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
			await tx.update(tournamentSettings)
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
