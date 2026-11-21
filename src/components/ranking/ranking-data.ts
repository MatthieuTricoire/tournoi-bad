import { queryOptions } from "@tanstack/react-query";
import {
	getCurrentRoundData,
	getMatchHistory,
	getRankingData,
	updateMatchScore,
} from "#/server/functions/tournaments";
import {
	type CorrectionResult,
	type CorrectionValues,
	type HistoryMatch,
	historyVersion,
	type RankingData,
} from "./types";

export async function loadRanking(): Promise<RankingData> {
	// Publish one query result only when all three reads succeeded. The existing
	// endpoints do not provide a shared database snapshot across these reads.
	const [ranking, round, history] = await Promise.all([
		getRankingData(),
		getCurrentRoundData(),
		getMatchHistory(),
	]);
	return { ranking, round, history, loadedAt: Date.now() };
}
export const rankingQuery = () =>
	queryOptions({
		queryKey: ["ranking-page"],
		queryFn: loadRanking,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

export async function correctRankingScore(
	match: HistoryMatch,
	round: number,
	values: CorrectionValues,
): Promise<CorrectionResult> {
	if (match.status !== "finished") return "conflict";
	try {
		const history = await getMatchHistory();
		const current = history
			.find((r) => r.round === round)
			?.matches.find((m) => m.id === match.id);
		if (historyVersion(current, round) !== historyVersion(match, round))
			return "conflict";
	} catch {
		return "retry";
	} // No POST attempted: retry is safe.
	// This preflight is not compare-and-swap: the existing correction endpoint
	// has no expected score/version parameter. A concurrent write can still win.
	try {
		await updateMatchScore({ data: { matchId: match.id, ...values } });
		return "saved";
	} catch {
		// A correction can commit despite a lost response. Do not post again,
		// even when a later read would happen to show the previous score.
		return "uncertain";
	}
}
