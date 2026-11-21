import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
	getRankingData: vi.fn(),
	getCurrentRoundData: vi.fn(),
	getMatchHistory: vi.fn(),
	updateMatchScore: vi.fn(),
}));
vi.mock("#/server/functions/tournaments", () => api);

import { rankingFixture } from "#/test-fixtures/ranking";
import { correctRankingScore, loadRanking, rankingQuery } from "./ranking-data";
import { historyVersion } from "./types";

beforeEach(() => {
	vi.resetAllMocks();
	const data = rankingFixture();
	api.getRankingData.mockResolvedValue(data.ranking);
	api.getCurrentRoundData.mockResolvedValue(data.round);
	api.getMatchHistory.mockResolvedValue(data.history);
	api.updateMatchScore.mockResolvedValue({ success: true });
});
afterEach(() => vi.restoreAllMocks());
const match = () => rankingFixture().history[1].matches[0];
const values = { scoreTeam1: 22, scoreTeam2: 19 };
it("publishes one coordinated dataset, timestamped only after all reads finish", async () => {
	let finish: (value: ReturnType<typeof rankingFixture>["history"]) => void =
		() => {};
	api.getMatchHistory.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const now = vi.spyOn(Date, "now").mockReturnValue(10);
	let settled = false;
	const promise = loadRanking().then((data) => {
		settled = true;
		return data;
	});
	await Promise.resolve();
	expect(settled).toBe(false);
	now.mockReturnValue(20);
	finish(rankingFixture().history);
	const result = await promise;
	expect(result.loadedAt).toBe(20);
	expect(result.ranking).toEqual(rankingFixture().ranking);
	expect(result.history).toEqual(rankingFixture().history);
});
it("keeps the whole prior snapshot when one refresh read fails", async () => {
	const client = new QueryClient();
	const previous = await client.fetchQuery(rankingQuery());
	api.getRankingData.mockResolvedValue([]);
	api.getMatchHistory.mockRejectedValue(new Error("offline"));
	await expect(
		client.fetchQuery({ ...rankingQuery(), staleTime: 0 }),
	).rejects.toThrow("offline");
	expect(client.getQueryData(rankingQuery().queryKey)).toBe(previous);
	client.clear();
});
it("does not poll or refetch on focus/reconnect", () => {
	const options = rankingQuery();
	expect(options.retry).toBe(false);
	expect(options.refetchOnWindowFocus).toBe(false);
	expect(options.refetchOnReconnect).toBe(false);
	expect(options).not.toHaveProperty("refetchInterval");
});
it("preflights the current score and submits a finished match correction", async () => {
	expect(await correctRankingScore(match(), 2, values)).toBe("saved");
	expect(api.getMatchHistory).toHaveBeenCalledTimes(1);
	expect(api.updateMatchScore).toHaveBeenCalledExactlyOnceWith({
		data: { matchId: 21, ...values },
	});
});
it("permits correction of finished matches after closure", async () => {
	api.getMatchHistory.mockResolvedValue(rankingFixture("closed").history);
	expect(await correctRankingScore(match(), 2, values)).toBe("saved");
});
it("never sends corrections for waiting matches", async () => {
	expect(
		await correctRankingScore(
			rankingFixture().history[1].matches[1],
			2,
			values,
		),
	).toBe("conflict");
	expect(api.updateMatchScore).not.toHaveBeenCalled();
});
it("blocks a score changed on another device before submission", async () => {
	const fresh = rankingFixture();
	fresh.history[1].matches[0].team1[0].teamScore = 25;
	api.getMatchHistory.mockResolvedValue(fresh.history);
	expect(await correctRankingScore(match(), 2, values)).toBe("conflict");
	expect(api.updateMatchScore).not.toHaveBeenCalled();
});
it("blocks a changed assignment independently of the score", async () => {
	const fresh = rankingFixture();
	fresh.history[1].matches[0].team1[0].playerId = 99;
	api.getMatchHistory.mockResolvedValue(fresh.history);
	expect(await correctRankingScore(match(), 2, values)).toBe("conflict");
	expect(api.updateMatchScore).not.toHaveBeenCalled();
});
it("blocks a removed match or changed status", async () => {
	api.getMatchHistory.mockResolvedValue([]);
	expect(await correctRankingScore(match(), 2, values)).toBe("conflict");
	const fresh = rankingFixture();
	fresh.history[1].matches[0].status = "waiting";
	api.getMatchHistory.mockResolvedValue(fresh.history);
	expect(await correctRankingScore(match(), 2, values)).toBe("conflict");
	expect(api.updateMatchScore).not.toHaveBeenCalled();
});
it("allows a safe retry when the preflight failed before any write", async () => {
	api.getMatchHistory.mockRejectedValue(new Error("offline"));
	expect(await correctRankingScore(match(), 2, values)).toBe("retry");
	expect(api.updateMatchScore).not.toHaveBeenCalled();
});
it("treats every failed POST response as uncertain, even if the previous score is still readable", async () => {
	api.updateMatchScore.mockRejectedValue(new Error("lost response"));
	expect(await correctRankingScore(match(), 2, values)).toBe("uncertain");
	expect(api.updateMatchScore).toHaveBeenCalledTimes(1);
	expect(api.getMatchHistory).toHaveBeenCalledTimes(1);
});
it("ignores name and participant ordering changes in the score version", () => {
	const original = match(),
		fresh = structuredClone(original);
	fresh.team1.reverse();
	fresh.team1[0].firstname = "Nouveau prénom";
	expect(historyVersion(fresh, 2)).toBe(historyVersion(original, 2));
	expect(historyVersion(fresh, 1)).not.toBe(historyVersion(original, 2));
});
