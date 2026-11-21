import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardFixture } from "#/test-fixtures/dashboard";

const api = vi.hoisted(() => ({
	round: vi.fn(),
	schedule: vi.fn(),
	players: vi.fn(),
	submit: vi.fn(),
}));
vi.mock("#/server/functions/tournaments", () => ({
	getCurrentRoundData: api.round,
	getRoundRobinSchedule: api.schedule,
	submitMatchScore: api.submit,
}));
vi.mock("#/server/functions/players", () => ({ getPlayers: api.players }));

import {
	dashboardQuery,
	loadDashboard,
	saveDashboardScore,
} from "./dashboard-data";

beforeEach(() => {
	vi.resetAllMocks();
	const fixture = dashboardFixture();
	api.round.mockResolvedValue(fixture.round);
	api.schedule.mockResolvedValue(fixture.schedule);
	api.players.mockResolvedValue(fixture.players);
	api.submit.mockResolvedValue({ success: true });
});
afterEach(() => vi.restoreAllMocks());
const values = { scoreTeam1: 21, scoreTeam2: 0 };
const match = () => dashboardFixture().round.matches[1];

describe("score requests", () => {
	it("verifies the current assignment before sending the exact score", async () => {
		expect(await saveDashboardScore(match(), 3, values)).toBe("saved");
		expect(api.round).toHaveBeenCalledOnce();
		expect(api.submit).toHaveBeenCalledExactlyOnceWith({
			data: { matchId: 2, ...values },
		});
	});
	it("refuses a stale score already recorded on another device", async () => {
		const current = dashboardFixture();
		current.round.matches[1].status = "finished";
		api.round.mockResolvedValue(current.round);
		expect(await saveDashboardScore(match(), 3, values)).toBe("conflict");
		expect(api.submit).not.toHaveBeenCalled();
	});
	it("refuses an assignment from an older rotation", async () => {
		const current = dashboardFixture();
		current.round.currentRound = 4;
		api.round.mockResolvedValue(current.round);
		expect(await saveDashboardScore(match(), 3, values)).toBe("conflict");
		expect(api.submit).not.toHaveBeenCalled();
	});
	it("does not post if the preflight read fails", async () => {
		api.round.mockRejectedValue(new Error("network"));
		expect(await saveDashboardScore(match(), 3, values)).toBe("retry");
		expect(api.submit).not.toHaveBeenCalled();
	});
	it("allows a retry only when the failed write is followed by an unchanged waiting match", async () => {
		api.submit.mockRejectedValue(
			new Error("SQL credentials must never be shown"),
		);
		expect(await saveDashboardScore(match(), 3, values)).toBe("retry");
		expect(api.round).toHaveBeenCalledTimes(2);
	});
	it("recognizes a lost response when the score was nevertheless recorded", async () => {
		const current = dashboardFixture();
		current.round.matches[1].status = "finished";
		api.round
			.mockResolvedValueOnce(dashboardFixture().round)
			.mockResolvedValueOnce(current.round);
		api.submit.mockRejectedValue(new Error("lost response"));
		expect(await saveDashboardScore(match(), 3, values)).toBe("conflict");
		expect(api.submit).toHaveBeenCalledOnce();
	});
	it("requires reconciliation when both the write and its verification fail", async () => {
		api.round
			.mockResolvedValueOnce(dashboardFixture().round)
			.mockRejectedValueOnce(new Error("offline"));
		api.submit.mockRejectedValue(new Error("offline"));
		expect(await saveDashboardScore(match(), 3, values)).toBe("uncertain");
		expect(api.submit).toHaveBeenCalledOnce();
	});
	it("ignores the ordering of players inside the same teams", async () => {
		const current = dashboardFixture();
		current.round.matches[1].team1.reverse();
		api.round.mockResolvedValue(current.round);
		expect(await saveDashboardScore(match(), 3, values)).toBe("saved");
	});
});

describe("dashboard refresh", () => {
	it("timestamps the successful load after every request has completed", async () => {
		vi.spyOn(Date, "now").mockReturnValue(1000);
		let finish: () => void = () => {};
		api.players.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = () => resolve(dashboardFixture().players);
				}),
		);
		const request = loadDashboard();
		vi.mocked(Date.now).mockReturnValue(2000);
		finish();
		expect((await request).loadedAt).toBe(2000);
	});
	it("retains the previous data and timestamp when refreshing fails", async () => {
		const client = new QueryClient();
		const first = await client.fetchQuery(dashboardQuery());
		api.players.mockRejectedValue(new Error("offline"));
		await expect(
			client.fetchQuery({ ...dashboardQuery(), staleTime: 0 }),
		).rejects.toThrow("offline");
		expect(client.getQueryData(dashboardQuery().queryKey)).toEqual(first);
		client.clear();
	});
	it("does not enable polling, focus refresh or automatic retries", () => {
		const options = dashboardQuery();
		expect(options.refetchOnWindowFocus).toBe(false);
		expect(options.refetchOnReconnect).toBe(false);
		expect(options.retry).toBe(false);
		expect(options.refetchInterval).toBeUndefined();
	});
});
