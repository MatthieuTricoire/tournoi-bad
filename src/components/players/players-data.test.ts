import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getPlayers: vi.fn() }));
vi.mock("#/server/functions/players", () => api);

import { playersFixture } from "#/test-fixtures/players";
import { loadPlayers, playersQuery } from "./players-data";

afterEach(() => vi.restoreAllMocks());
it("records a timestamp only after the players read finishes", async () => {
	let finish: (value: ReturnType<typeof playersFixture>["players"]) => void =
		() => {};
	api.getPlayers.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const now = vi.spyOn(Date, "now").mockReturnValue(10);
	const pending = loadPlayers();
	now.mockReturnValue(20);
	finish(playersFixture().players);
	expect((await pending).loadedAt).toBe(20);
});
it("preserves cached players and the successful timestamp after a failed refresh", async () => {
	const client = new QueryClient();
	api.getPlayers.mockResolvedValue(playersFixture().players);
	const previous = await client.fetchQuery(playersQuery());
	api.getPlayers.mockRejectedValue(new Error("offline"));
	await expect(
		client.fetchQuery({ ...playersQuery(), staleTime: 0 }),
	).rejects.toThrow("offline");
	expect(client.getQueryData(playersQuery().queryKey)).toBe(previous);
	client.clear();
});
it("does not poll or refetch on focus/reconnect", () => {
	const options = playersQuery();
	expect(options.retry).toBe(false);
	expect(options.refetchOnWindowFocus).toBe(false);
	expect(options.refetchOnReconnect).toBe(false);
	expect(options).not.toHaveProperty("refetchInterval");
});
