// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { rankingFixture } from "#/test-fixtures/ranking";

const api = vi.hoisted(() => ({
	players: vi.fn(),
	ranking: vi.fn(),
	history: vi.fn(),
	round: vi.fn(),
	schedule: vi.fn(),
}));
vi.mock("#/server/functions/players", () => ({ getPlayers: api.players }));
vi.mock("#/server/functions/tournaments", () => ({
	getCurrentRoundData: api.round,
	getRoundRobinSchedule: api.schedule,
	submitMatchScore: vi.fn(),
	startNextRound: vi.fn(),
	finishTournament: vi.fn(),
	getRankingData: api.ranking,
	getMatchHistory: api.history,
	updateMatchScore: vi.fn(),
	resetTournament: vi.fn(),
	updateTournamentSettings: vi.fn(),
}));
vi.mock("#/routes/__root", async () => {
	const { createRootRouteWithContext } = await import("@tanstack/react-router");
	return {
		Route: createRootRouteWithContext<{ queryClient: QueryClient }>()({}),
	};
});

import { routeTree } from "#/routeTree.gen";

beforeAll(() => {
	window.scrollTo = vi.fn();
});
afterEach(cleanup);
beforeEach(() => {
	vi.resetAllMocks();
	const data = rankingFixture();
	api.round.mockResolvedValue(data.round);
	api.ranking.mockResolvedValue(data.ranking);
	api.history.mockResolvedValue(data.history);
});
function makeRouter() {
	return createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: ["/classement"] }),
		context: { queryClient: new QueryClient() },
		defaultPendingMs: 0,
		defaultPendingMinMs: 0,
	});
}

it("shows a French ranking loading state until all reads finish", async () => {
	let finish: (history: ReturnType<typeof rankingFixture>["history"]) => void =
		() => {};
	api.history.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const router = makeRouter(),
		load = router.load();
	render(createElement(RouterProvider, { router }));
	expect(await screen.findByText("Chargement du classement…")).toBeTruthy();
	await act(async () => {
		finish(rankingFixture().history);
		await load;
	});
	expect(
		await screen.findByRole("heading", {
			name: "Classement",
		}),
	).toBeTruthy();
});
it("shows a safe French load error and can retry without exposing server details", async () => {
	api.history.mockRejectedValue(new Error("SQL AUTH SECRET"));
	const router = makeRouter();
	await router.load();
	render(createElement(RouterProvider, { router }));
	expect(
		await screen.findByRole("heading", { name: "Classement indisponible" }),
	).toBeTruthy();
	expect(document.body.textContent).not.toContain("SQL AUTH SECRET");
	api.history.mockResolvedValue(rankingFixture().history);
	fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
	expect(
		await screen.findByRole("heading", {
			name: "Classement",
		}),
	).toBeTruthy();
});
