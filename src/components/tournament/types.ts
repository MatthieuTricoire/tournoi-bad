import type { getPlayers } from "#/server/functions/players";
import type {
	getCurrentRoundData,
	getRoundRobinSchedule,
} from "#/server/functions/tournaments";

export type RoundData = Awaited<ReturnType<typeof getCurrentRoundData>>;
export type CourtMatch = RoundData["matches"][number];
export type DashboardData = {
	round: RoundData;
	schedule: Awaited<ReturnType<typeof getRoundRobinSchedule>>;
	players: Awaited<ReturnType<typeof getPlayers>>;
	loadedAt: number;
};
export type ScoreValues = { scoreTeam1: number; scoreTeam2: number };
export type ScoreResult = "saved" | "retry" | "conflict" | "uncertain";
export type DashboardActions = {
	refresh: () => Promise<unknown>;
	generate: () => Promise<unknown>;
	finish: () => Promise<unknown>;
	saveScore: (
		match: CourtMatch,
		roundNumber: number,
		values: ScoreValues,
	) => Promise<ScoreResult>;
};

// Compare identities, assignment and status, never the current presence of players.
export function matchVersion(
	match: CourtMatch | undefined,
	roundNumber: number,
) {
	return JSON.stringify(
		match
			? [
					roundNumber,
					match.id,
					match.court,
					match.status,
					match.team1
						.map((p) => [p.playerId, p.teamScore])
						.sort((a, b) => a[0] - b[0]),
					match.team2
						.map((p) => [p.playerId, p.teamScore])
						.sort((a, b) => a[0] - b[0]),
				]
			: null,
	);
}
