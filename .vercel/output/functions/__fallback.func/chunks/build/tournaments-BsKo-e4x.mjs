import { o as createServerFn } from "./server.mjs";
import { i as object, n as boolean$1, r as number$1, t as _enum } from "./zod-BVSic0_0.mjs";
import { a as getRoundRobinProgress, i as getCompletedPairsSet, n as generateRound, r as generateRoundRobinRound } from "./utils-C27VYztf.mjs";
import { a as eq, c as players, i as desc, l as sql, n as createServerRpc, o as matchParticipants, r as db, s as matches, t as and, u as tournamentSettings } from "./db--EECSrl1.mjs";
//#region .nitro/vite/services/ssr/assets/tournaments-BsKo-e4x.js
var updateAvailableCourts_createServerFn_handler = createServerRpc({
	id: "8d2e207e010b40940c2f6b0d917970309f322336774c6caf1d1e60c8dd40e989",
	name: "updateAvailableCourts",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => updateAvailableCourts.__executeServer(opts));
var updateAvailableCourts = createServerFn({ method: "POST" }).inputValidator((data) => object({ courts: number$1().min(1).max(10) }).parse(data)).handler(updateAvailableCourts_createServerFn_handler, async ({ data }) => {
	await db.insert(tournamentSettings).values({
		id: 1,
		availableCourts: data.courts
	}).onConflictDoUpdate({
		target: tournamentSettings.id,
		set: { availableCourts: data.courts }
	});
	return { success: true };
});
var getLeaderBoard_createServerFn_handler = createServerRpc({
	id: "3f88fed95f4abf72603ded5affb40a9ccb1a000f3ba5f2152f593cdb77194693",
	name: "getLeaderBoard",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => getLeaderBoard.__executeServer(opts));
var getLeaderBoard = createServerFn({ method: "GET" }).handler(getLeaderBoard_createServerFn_handler, async () => {
	return await db.select({
		id: players.id,
		firstname: players.firstname,
		lastname: players.lastname,
		playedGames: players.playedGames,
		totalScore: players.totalScore,
		averageScore: sql`
CASE 
WHEN ${players.playedGames} > 0 THEN CAST(${players.totalScore} AS REAL) / ${players.playedGames}
ELSE 0
END
       `.as("average_score")
	}).from(players).where(eq(players.present, true)).orderBy(sql`average_score DESC`, players.totalScore);
});
var startNextRound_createServerFn_handler = createServerRpc({
	id: "029301dfbdc01e586f0b964812ee6b0356a8caf71611a92dccf07011e6bd9009",
	name: "startNextRound",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => startNextRound.__executeServer(opts));
var startNextRound = createServerFn({ method: "POST" }).handler(startNextRound_createServerFn_handler, async () => {
	return await db.transaction(async (tx) => {
		const settings = await tx.select({
			availableCourts: tournamentSettings.availableCourts,
			roundType: tournamentSettings.roundType,
			maxRounds: tournamentSettings.maxRounds,
			status: tournamentSettings.status,
			maximizeParity: tournamentSettings.maximizeParity
		}).from(tournamentSettings).where(eq(tournamentSettings.id, 1)).get();
		const maxCourts = settings ? settings.availableCourts : 4;
		const roundType = settings ? settings.roundType : "infinite";
		const maxRounds = settings ? settings.maxRounds ?? 0 : 0;
		const maximizeParity = settings ? settings.maximizeParity : false;
		if (settings && settings.status === "finished") throw new Error("Le tournoi est terminé ! Impossible de générer un nouveau round.");
		const allPlayers = await tx.select({
			id: players.id,
			firstname: players.firstname,
			lastname: players.lastname,
			gender: players.gender,
			playedGames: players.playedGames
		}).from(players).where(eq(players.present, true)).all();
		const globalHistory = await tx.select({
			matchId: matchParticipants.matchId,
			playerId: matchParticipants.playerId,
			team: matchParticipants.team
		}).from(matchParticipants).all();
		const lastMatch = await tx.select({ roundNumber: matches.roundNumber }).from(matches).orderBy(desc(matches.roundNumber)).get();
		const nextRoundNumber = lastMatch ? lastMatch.roundNumber + 1 : 1;
		if (roundType === "fixed" && nextRoundNumber > maxRounds) {
			await tx.update(tournamentSettings).set({ status: "finished" }).where(eq(tournamentSettings.id, 1)).run();
			return {
				success: true,
				finished: true
			};
		}
		if (roundType === "roundrobin") {
			const completedPairs = getCompletedPairsSet(globalHistory);
			const totalPairs = allPlayers.length * (allPlayers.length - 1) / 2;
			if (completedPairs.size >= totalPairs) {
				await tx.update(tournamentSettings).set({ status: "finished" }).where(eq(tournamentSettings.id, 1)).run();
				return {
					success: true,
					finished: true
				};
			}
			const { matches: newMatches } = generateRoundRobinRound(allPlayers, globalHistory, maxCourts, nextRoundNumber);
			for (const matchData of newMatches) {
				const insertedMatch = await tx.insert(matches).values({
					roundNumber: matchData.roundNumber,
					court: matchData.court,
					status: "waiting"
				}).returning({ id: matches.id }).get();
				const participantsValues = [...matchData.team1Ids.map((pId) => ({
					matchId: insertedMatch.id,
					playerId: pId,
					team: 1
				})), ...matchData.team2Ids.map((pId) => ({
					matchId: insertedMatch.id,
					playerId: pId,
					team: 2
				}))];
				await tx.insert(matchParticipants).values(participantsValues).run();
				const activePlayerIds = [...matchData.team1Ids, ...matchData.team2Ids];
				for (const pId of activePlayerIds) {
					const player = await tx.select({ playedGames: players.playedGames }).from(players).where(eq(players.id, pId)).get();
					const currentGames = player ? player.playedGames : 0;
					await tx.update(players).set({ playedGames: currentGames + 1 }).where(eq(players.id, pId)).run();
				}
			}
			await tx.insert(tournamentSettings).values({
				id: 1,
				currentRound: nextRoundNumber
			}).onConflictDoUpdate({
				target: tournamentSettings.id,
				set: { currentRound: nextRoundNumber }
			}).run();
			return {
				success: true,
				round: nextRoundNumber
			};
		}
		const { matches: newMatches } = generateRound(allPlayers, globalHistory, maxCourts, nextRoundNumber, maximizeParity);
		for (const matchData of newMatches) {
			const insertedMatch = tx.insert(matches).values({
				roundNumber: matchData.roundNumber,
				court: matchData.court,
				status: "waiting"
			}).returning({ id: matches.id }).get();
			const participantsValues = [...matchData.team1Ids.map((pId) => ({
				matchId: insertedMatch.id,
				playerId: pId,
				team: 1
			})), ...matchData.team2Ids.map((pId) => ({
				matchId: insertedMatch.id,
				playerId: pId,
				team: 2
			}))];
			await tx.insert(matchParticipants).values(participantsValues).run();
			const activePlayerIds = [...matchData.team1Ids, ...matchData.team2Ids];
			for (const pId of activePlayerIds) {
				const player = tx.select({ playedGames: players.playedGames }).from(players).where(eq(players.id, pId)).get();
				const currentGames = player ? player.playedGames : 0;
				await tx.update(players).set({ playedGames: currentGames + 1 }).where(eq(players.id, pId)).run();
			}
		}
		await tx.insert(tournamentSettings).values({
			id: 1,
			currentRound: nextRoundNumber
		}).onConflictDoUpdate({
			target: tournamentSettings.id,
			set: { currentRound: nextRoundNumber }
		}).run();
		return {
			success: true,
			round: nextRoundNumber
		};
	});
});
var submitMatchScore_createServerFn_handler = createServerRpc({
	id: "d075379c2e3f8e620c0bf26a68e765db6e792f337f2273b00734bcdcbabd71bd",
	name: "submitMatchScore",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => submitMatchScore.__executeServer(opts));
var submitMatchScore = createServerFn({ method: "POST" }).inputValidator(object({
	matchId: number$1(),
	scoreTeam1: number$1().min(0),
	scoreTeam2: number$1().min(0)
})).handler(submitMatchScore_createServerFn_handler, async ({ data }) => {
	const { matchId, scoreTeam1, scoreTeam2 } = data;
	return await db.transaction(async (tx) => {
		await tx.update(matches).set({ status: "finished" }).where(eq(matches.id, matchId)).run();
		await tx.update(matchParticipants).set({ teamScore: scoreTeam1 }).where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.team, 1))).run();
		await tx.update(matchParticipants).set({ teamScore: scoreTeam2 }).where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.team, 2))).run();
		const participants = await tx.select({
			playerId: matchParticipants.playerId,
			team: matchParticipants.team
		}).from(matchParticipants).where(eq(matchParticipants.matchId, matchId)).all();
		for (const p of participants) {
			const pointsMarques = p.team === 1 ? scoreTeam1 : scoreTeam2;
			const player = await tx.select({ totalScore: players.totalScore }).from(players).where(eq(players.id, p.playerId)).get();
			const currentTotalScore = player ? player.totalScore : 0;
			await tx.update(players).set({ totalScore: currentTotalScore + pointsMarques }).where(eq(players.id, p.playerId)).run();
		}
		return { success: true };
	});
});
var updateMatchScore_createServerFn_handler = createServerRpc({
	id: "77c0749366b6866dd3a9cf2e2931681fd774e6512c889c968cd2c464a7528276",
	name: "updateMatchScore",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => updateMatchScore.__executeServer(opts));
var updateMatchScore = createServerFn({ method: "POST" }).inputValidator(object({
	matchId: number$1(),
	scoreTeam1: number$1().min(0),
	scoreTeam2: number$1().min(0)
})).handler(updateMatchScore_createServerFn_handler, async ({ data }) => {
	const { matchId, scoreTeam1, scoreTeam2 } = data;
	return await db.transaction(async (tx) => {
		const oldParticipants = await tx.select({
			playerId: matchParticipants.playerId,
			team: matchParticipants.team,
			teamScore: matchParticipants.teamScore
		}).from(matchParticipants).where(eq(matchParticipants.matchId, matchId)).all();
		for (const p of oldParticipants) {
			const oldScore = p.teamScore;
			const player = await tx.select({ totalScore: players.totalScore }).from(players).where(eq(players.id, p.playerId)).get();
			const currentTotal = player ? player.totalScore : 0;
			await tx.update(players).set({ totalScore: Math.max(0, currentTotal - oldScore) }).where(eq(players.id, p.playerId)).run();
		}
		await tx.update(matchParticipants).set({ teamScore: scoreTeam1 }).where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.team, 1))).run();
		await tx.update(matchParticipants).set({ teamScore: scoreTeam2 }).where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.team, 2))).run();
		const participants = await tx.select({
			playerId: matchParticipants.playerId,
			team: matchParticipants.team
		}).from(matchParticipants).where(eq(matchParticipants.matchId, matchId)).all();
		for (const p of participants) {
			const pointsMarques = p.team === 1 ? scoreTeam1 : scoreTeam2;
			const player = await tx.select({ totalScore: players.totalScore }).from(players).where(eq(players.id, p.playerId)).get();
			const currentTotalScore = player ? player.totalScore : 0;
			await tx.update(players).set({ totalScore: currentTotalScore + pointsMarques }).where(eq(players.id, p.playerId)).run();
		}
		return { success: true };
	});
});
var getCurrentRoundData_createServerFn_handler = createServerRpc({
	id: "dae972515382f12ff116a31a0ea7fdb01f1b4d96249119fc09dbedb50c0cb875",
	name: "getCurrentRoundData",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => getCurrentRoundData.__executeServer(opts));
var getCurrentRoundData = createServerFn({ method: "GET" }).handler(getCurrentRoundData_createServerFn_handler, async () => {
	const settings = await db.select().from(tournamentSettings).where(eq(tournamentSettings.id, 1)).get();
	const currentRound = settings ? settings.currentRound : 0;
	const availableCourts = settings ? settings.availableCourts : 4;
	const roundType = settings ? settings.roundType : "infinite";
	const maxRounds = settings ? settings.maxRounds ?? 0 : 0;
	const maximizeParity = settings ? settings.maximizeParity : false;
	const status = settings ? settings.status : "active";
	let roundRobinProgress = null;
	if (roundType === "roundrobin") roundRobinProgress = getRoundRobinProgress(await db.select({
		id: players.id,
		firstname: players.firstname,
		lastname: players.lastname,
		gender: players.gender,
		playedGames: players.playedGames
	}).from(players).where(eq(players.present, true)).all(), await db.select({
		matchId: matchParticipants.matchId,
		playerId: matchParticipants.playerId,
		team: matchParticipants.team
	}).from(matchParticipants).all(), availableCourts);
	if (currentRound === 0) return {
		currentRound,
		availableCourts,
		roundType,
		maxRounds,
		maximizeParity,
		status,
		matches: [],
		restingPlayers: [],
		roundRobinProgress
	};
	const roundMatches = await db.select().from(matches).where(eq(matches.roundNumber, currentRound)).orderBy(matches.court).all();
	const matchesWithPlayers = [];
	for (const match of roundMatches) {
		const participants = await db.select({
			team: matchParticipants.team,
			teamScore: matchParticipants.teamScore,
			playerId: players.id,
			firstname: players.firstname,
			lastname: players.lastname
		}).from(matchParticipants).innerJoin(players, eq(matchParticipants.playerId, players.id)).where(eq(matchParticipants.matchId, match.id)).all();
		const team1 = participants.filter((p) => p.team === 1);
		const team2 = participants.filter((p) => p.team === 2);
		matchesWithPlayers.push({
			id: match.id,
			court: match.court,
			status: match.status,
			team1,
			team2
		});
	}
	const allPresentPlayers = await db.select().from(players).where(eq(players.present, true)).all();
	const activePlayerIds = new Set(matchesWithPlayers.flatMap((m) => [...m.team1.map((p) => p.playerId), ...m.team2.map((p) => p.playerId)]));
	return {
		currentRound,
		availableCourts,
		roundType,
		maxRounds,
		maximizeParity,
		status,
		matches: matchesWithPlayers,
		restingPlayers: allPresentPlayers.filter((p) => !activePlayerIds.has(p.id)),
		roundRobinProgress
	};
});
var getRoundRobinSchedule_createServerFn_handler = createServerRpc({
	id: "94617b320229a68017a15da6b5a92ed2bb577bd47a90076070aa7a7e9d75611d",
	name: "getRoundRobinSchedule",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => getRoundRobinSchedule.__executeServer(opts));
var getRoundRobinSchedule = createServerFn({ method: "GET" }).handler(getRoundRobinSchedule_createServerFn_handler, async () => {
	const settings = await db.select().from(tournamentSettings).where(eq(tournamentSettings.id, 1)).get();
	if (!settings || settings.roundType === "infinite") return { rounds: [] };
	const allPlayers = await db.select({
		id: players.id,
		firstname: players.firstname,
		lastname: players.lastname,
		gender: players.gender,
		playedGames: players.playedGames
	}).from(players).where(eq(players.present, true)).all();
	const globalHistory = await db.select({
		matchId: matchParticipants.matchId,
		playerId: matchParticipants.playerId,
		team: matchParticipants.team
	}).from(matchParticipants).all();
	const lastMatch = await db.select({ roundNumber: matches.roundNumber }).from(matches).orderBy(desc(matches.roundNumber)).get();
	const nextRoundNumber = lastMatch ? lastMatch.roundNumber + 1 : 1;
	const maxCourts = settings?.availableCourts ?? 4;
	const maximizeParity = settings?.maximizeParity ?? false;
	const roundType = settings.roundType;
	const maxRounds = settings.maxRounds ?? 0;
	const completedPairs = getCompletedPairsSet(globalHistory);
	const totalPairs = allPlayers.length * (allPlayers.length - 1) / 2;
	if (roundType === "roundrobin" && completedPairs.size >= totalPairs) return {
		rounds: [],
		completed: true
	};
	const simRounds = [];
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
			const result = roundType === "roundrobin" ? generateRoundRobinRound(simPlayers, simHistory, maxCourts, simRound) : generateRound(simPlayers, simHistory, maxCourts, simRound, maximizeParity);
			const teams = result.matches.flatMap((m) => {
				const p1 = simPlayers.find((p) => p.id === m.team1Ids[0]);
				const p2 = simPlayers.find((p) => p.id === m.team1Ids[1]);
				const p3 = simPlayers.find((p) => p.id === m.team2Ids[0]);
				const p4 = simPlayers.find((p) => p.id === m.team2Ids[1]);
				return [{
					player1: {
						id: p1.id,
						firstname: p1.firstname,
						lastname: p1.lastname
					},
					player2: {
						id: p2.id,
						firstname: p2.firstname,
						lastname: p2.lastname
					}
				}, {
					player1: {
						id: p3.id,
						firstname: p3.firstname,
						lastname: p3.lastname
					},
					player2: {
						id: p4.id,
						firstname: p4.firstname,
						lastname: p4.lastname
					}
				}];
			});
			const remainingPairs = roundType === "roundrobin" ? totalPairs - getCompletedPairsSet(simHistory).size : maxRounds - (simRounds.length + 1);
			simRounds.push({
				roundNumber: simRound,
				remainingPairs,
				teams
			});
			const allPlayedIds = new Set(result.matches.flatMap((m) => [...m.team1Ids, ...m.team2Ids]));
			for (const p of simPlayers) if (allPlayedIds.has(p.id)) p.playedGames++;
			simHistory = [...simHistory, ...result.matches.flatMap((m, matchIdx) => [...m.team1Ids.map((pid) => ({
				matchId: -(simRound * 10 + matchIdx),
				playerId: pid,
				team: 1
			})), ...m.team2Ids.map((pid) => ({
				matchId: -(simRound * 10 + matchIdx),
				playerId: pid,
				team: 2
			}))])];
			simRound++;
		} catch {
			break;
		}
	}
	return {
		rounds: simRounds,
		completed: roundType === "fixed" && simRounds.length >= maxRounds
	};
});
var getMatchHistory_createServerFn_handler = createServerRpc({
	id: "fe88c873682b128c9d3308f250503bd51cfed64bd515d0da9b8e2e854e8311f3",
	name: "getMatchHistory",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => getMatchHistory.__executeServer(opts));
var getMatchHistory = createServerFn({ method: "GET" }).handler(getMatchHistory_createServerFn_handler, async () => {
	const allMatches = await db.select({
		id: matches.id,
		roundNumber: matches.roundNumber,
		court: matches.court,
		status: matches.status
	}).from(matches).orderBy(matches.roundNumber, matches.court).all();
	const historyByRound = {};
	for (const match of allMatches) {
		const participants = await db.select({
			team: matchParticipants.team,
			teamScore: matchParticipants.teamScore,
			playerId: players.id,
			firstname: players.firstname,
			lastname: players.lastname
		}).from(matchParticipants).innerJoin(players, eq(matchParticipants.playerId, players.id)).where(eq(matchParticipants.matchId, match.id)).all();
		if (!historyByRound[match.roundNumber]) historyByRound[match.roundNumber] = [];
		historyByRound[match.roundNumber].push({
			id: match.id,
			court: match.court,
			team1: participants.filter((p) => p.team === 1).map((p) => ({
				playerId: p.playerId,
				firstname: p.firstname,
				lastname: p.lastname,
				teamScore: p.teamScore
			})),
			team2: participants.filter((p) => p.team === 2).map((p) => ({
				playerId: p.playerId,
				firstname: p.firstname,
				lastname: p.lastname,
				teamScore: p.teamScore
			}))
		});
	}
	return Object.entries(historyByRound).map(([round, matches]) => ({
		round: Number(round),
		matches
	})).sort((a, b) => a.round - b.round);
});
var getRankingData_createServerFn_handler = createServerRpc({
	id: "1492b33a06770c3849f5aa39544a82704eaee8cfa08baaf4ba800876d09356ca",
	name: "getRankingData",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => getRankingData.__executeServer(opts));
var getRankingData = createServerFn({ method: "GET" }).handler(getRankingData_createServerFn_handler, async () => {
	return await db.transaction(async (tx) => {
		const allPlayers = await tx.select({
			id: players.id,
			firstname: players.firstname,
			lastname: players.lastname,
			playedGames: players.playedGames,
			totalScore: players.totalScore
		}).from(players).where(eq(players.present, true)).all();
		const finishedParticipants = await tx.select({
			matchId: matches.id,
			playerId: matchParticipants.playerId,
			team: matchParticipants.team,
			teamScore: matchParticipants.teamScore
		}).from(matches).innerJoin(matchParticipants, eq(matches.id, matchParticipants.matchId)).where(eq(matches.status, "finished")).all();
		const matchMap = /* @__PURE__ */ new Map();
		for (const row of finishedParticipants) {
			if (!matchMap.has(row.matchId)) matchMap.set(row.matchId, []);
			matchMap.get(row.matchId).push(row);
		}
		const winsMap = /* @__PURE__ */ new Map();
		const lossesMap = /* @__PURE__ */ new Map();
		for (const [, participants] of matchMap) {
			const t1 = participants.filter((p) => p.team === 1);
			const t2 = participants.filter((p) => p.team === 2);
			const s1 = t1[0]?.teamScore ?? 0;
			const s2 = t2[0]?.teamScore ?? 0;
			for (const p of t1) if (s1 > s2) winsMap.set(p.playerId, (winsMap.get(p.playerId) ?? 0) + 1);
			else if (s1 < s2) lossesMap.set(p.playerId, (lossesMap.get(p.playerId) ?? 0) + 1);
			for (const p of t2) if (s2 > s1) winsMap.set(p.playerId, (winsMap.get(p.playerId) ?? 0) + 1);
			else if (s2 < s1) lossesMap.set(p.playerId, (lossesMap.get(p.playerId) ?? 0) + 1);
		}
		return allPlayers.map((p) => ({
			id: p.id,
			firstname: p.firstname,
			lastname: p.lastname,
			playedGames: p.playedGames,
			wins: winsMap.get(p.id) ?? 0,
			losses: lossesMap.get(p.id) ?? 0,
			totalScore: p.totalScore,
			averageScore: p.playedGames > 0 ? Math.round(p.totalScore / p.playedGames * 100) / 100 : 0
		})).sort((a, b) => {
			if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
			return b.totalScore - a.totalScore;
		}).map((p, i) => ({
			...p,
			ranking: i + 1
		}));
	});
});
var finishTournament_createServerFn_handler = createServerRpc({
	id: "711d4175241775fccb8b4d02f93c0e0e9dcf8a861b696ae6086fbf068fe54e63",
	name: "finishTournament",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => finishTournament.__executeServer(opts));
var finishTournament = createServerFn({ method: "POST" }).handler(finishTournament_createServerFn_handler, async () => {
	await db.update(tournamentSettings).set({ status: "finished" }).where(eq(tournamentSettings.id, 1));
	return { success: true };
});
var updateTournamentSettings_createServerFn_handler = createServerRpc({
	id: "fcbb745a904ae1470ad2b409368419f6af057295b519a1da50366222ca89eb7c",
	name: "updateTournamentSettings",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => updateTournamentSettings.__executeServer(opts));
var updateTournamentSettings = createServerFn({ method: "POST" }).inputValidator(object({
	roundType: _enum([
		"infinite",
		"fixed",
		"roundrobin"
	]),
	maxRounds: number$1().min(0),
	maximizeParity: boolean$1(),
	availableCourts: number$1().min(1)
})).handler(updateTournamentSettings_createServerFn_handler, async ({ data }) => {
	await db.insert(tournamentSettings).values({
		id: 1,
		...data,
		currentRound: 0,
		status: "active"
	}).onConflictDoUpdate({
		target: tournamentSettings.id,
		set: data
	});
	return { success: true };
});
var resetTournament_createServerFn_handler = createServerRpc({
	id: "6b72514699143b7e6c67c40f8a27e88e983563d79e7b5dfb1b6eb5d554bd47a2",
	name: "resetTournament",
	filename: "src/server/functions/tournaments.ts"
}, (opts) => resetTournament.__executeServer(opts));
var resetTournament = createServerFn({ method: "POST" }).handler(resetTournament_createServerFn_handler, async () => {
	return await db.transaction(async (tx) => {
		await tx.delete(matchParticipants).run();
		await tx.delete(matches).run();
		await tx.update(players).set({
			totalScore: 0,
			playedGames: 0
		}).run();
		await tx.update(tournamentSettings).set({
			currentRound: 0,
			status: "active",
			roundType: "infinite",
			maxRounds: 0
		}).where(eq(tournamentSettings.id, 1)).run();
		return { success: true };
	});
});
//#endregion
export { finishTournament_createServerFn_handler, getCurrentRoundData_createServerFn_handler, getLeaderBoard_createServerFn_handler, getMatchHistory_createServerFn_handler, getRankingData_createServerFn_handler, getRoundRobinSchedule_createServerFn_handler, resetTournament_createServerFn_handler, startNextRound_createServerFn_handler, submitMatchScore_createServerFn_handler, updateAvailableCourts_createServerFn_handler, updateMatchScore_createServerFn_handler, updateTournamentSettings_createServerFn_handler };
