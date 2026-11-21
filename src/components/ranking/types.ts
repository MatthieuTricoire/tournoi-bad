import type {
	getCurrentRoundData,
	getMatchHistory,
	getRankingData,
} from "#/server/functions/tournaments";

export type RankingData = {
	ranking: Awaited<ReturnType<typeof getRankingData>>;
	round: Awaited<ReturnType<typeof getCurrentRoundData>>;
	history: Awaited<ReturnType<typeof getMatchHistory>>;
	loadedAt: number;
};
export type RankingEntry = RankingData["ranking"][number];
export type HistoryMatch = RankingData["history"][number]["matches"][number];
export type CorrectionValues = { scoreTeam1: number; scoreTeam2: number };
export type CorrectionResult = "saved" | "retry" | "conflict" | "uncertain";
export type RankingActions = {
	refresh: () => Promise<unknown>;
	correct: (
		match: HistoryMatch,
		round: number,
		values: CorrectionValues,
	) => Promise<CorrectionResult>;
};

export function historyVersion(match: HistoryMatch | undefined, round: number) {
	return JSON.stringify(
		match
			? [
					round,
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

export const formatAverage = (value: number) =>
	new Intl.NumberFormat("fr-FR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
