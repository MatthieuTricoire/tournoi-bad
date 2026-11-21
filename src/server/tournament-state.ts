import { eq } from "drizzle-orm";
import type { db } from "#/db";
import {
	matches,
	matchParticipants,
	players,
	tournamentSettings,
} from "#/db/schema";
import { getRoundRobinProgress } from "#/lib/utils";

export type TournamentTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Both planned and finished rows are retained; consumers explicitly choose which count.
export async function readTournamentHistory(source: typeof db | TournamentTx) {
	return source
		.select({
			matchId: matchParticipants.matchId,
			playerId: matchParticipants.playerId,
			team: matchParticipants.team,
			roundNumber: matches.roundNumber,
			status: matches.status,
		})
		.from(matchParticipants)
		.innerJoin(matches, eq(matches.id, matchParticipants.matchId))
		.all();
}

// Coverage is measured over currently present players, using finished matches only.
export async function closeCompletedTournament(tx: TournamentTx) {
	const waiting = await tx
		.select({ id: matches.id })
		.from(matches)
		.where(eq(matches.status, "waiting"))
		.get();
	if (waiting) return false;
	const settings = await tx
		.select()
		.from(tournamentSettings)
		.where(eq(tournamentSettings.id, 1))
		.get();
	if (!settings || settings.status === "finished")
		return settings?.status === "finished";
	let complete =
		settings.roundType === "fixed" &&
		settings.currentRound >= (settings.maxRounds ?? 0);
	if (settings.roundType === "roundrobin") {
		const present = await tx
			.select()
			.from(players)
			.where(eq(players.present, true))
			.all();
		const history = await readTournamentHistory(tx);
		complete = getRoundRobinProgress(
			present,
			history,
			settings.availableCourts,
		).complete;
	}
	if (complete)
		await tx
			.update(tournamentSettings)
			.set({ status: "finished" })
			.where(eq(tournamentSettings.id, 1))
			.run();
	return complete;
}
