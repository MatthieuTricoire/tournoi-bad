import { queryOptions } from "@tanstack/react-query";
import { getPlayers } from "#/server/functions/players";
import {
	getCurrentRoundData,
	getRoundRobinSchedule,
	submitMatchScore,
} from "#/server/functions/tournaments";
import {
	type CourtMatch,
	type DashboardData,
	matchVersion,
	type ScoreResult,
	type ScoreValues,
} from "./types";

export async function loadDashboard(): Promise<DashboardData> {
	const [round, schedule, players] = await Promise.all([
		getCurrentRoundData(),
		getRoundRobinSchedule(),
		getPlayers(),
	]);
	return { round, schedule, players, loadedAt: Date.now() };
}

export const dashboardQuery = () =>
	queryOptions({
		queryKey: ["tournament-dashboard"],
		queryFn: loadDashboard,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

export async function saveDashboardScore(
	match: CourtMatch,
	roundNumber: number,
	values: ScoreValues,
): Promise<ScoreResult> {
	const expected = matchVersion(match, roundNumber);
	const hasChanged = async () => {
		const current = await getCurrentRoundData();
		return (
			matchVersion(
				current.matches.find((m) => m.id === match.id),
				current.currentRound,
			) !== expected
		);
	};
	// A read before writing catches known stale assignments. The server remains
	// responsible for the race between this read and the atomic score transition.
	try {
		if (await hasChanged()) return "conflict";
	} catch {
		return "retry";
	} // No POST was attempted.
	try {
		await submitMatchScore({ data: { matchId: match.id, ...values } });
		return "saved";
	} catch {
		// A lost response may hide a successful write. Never blindly post again.
		try {
			return (await hasChanged()) ? "conflict" : "retry";
		} catch {
			return "uncertain";
		}
	}
}
