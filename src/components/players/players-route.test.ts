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
import { dashboardFixture } from "#/test-fixtures/dashboard";

const api = vi.hoisted(() => ({
	players: vi.fn(),
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
	getRankingData: vi.fn(),
	getMatchHistory: vi.fn(),
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
	const data = dashboardFixture("preparation");
	api.round.mockResolvedValue(data.round);
	api.schedule.mockResolvedValue(data.schedule);
	api.players.mockResolvedValue(data.players);
});
function makeRouter() {
	return createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: ["/joueurs"] }),
		context: { queryClient: new QueryClient() },
		defaultPendingMs: 0,
		defaultPendingMinMs: 0,
	});
}

it("shows a French players loading state until the players request finishes", async () => {
	let finish: (players: DashboardPlayers) => void = () => {};
	type DashboardPlayers = ReturnType<typeof dashboardFixture>["players"];
	api.players.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const router = makeRouter(),
		load = router.load();
	render(createElement(RouterProvider, { router }));
	expect(await screen.findByText("Chargement des joueurs…")).toBeTruthy();
	await act(async () => {
		finish(dashboardFixture().players);
		await load;
	});
	expect(
		await screen.findByRole("heading", {
			name: "Joueurs",
		}),
	).toBeTruthy();
});
it("shows a safe French load error and can retry without exposing server details", async () => {
	api.players.mockRejectedValue(new Error("SQL AUTH SECRET"));
	const router = makeRouter();
	await router.load();
	render(createElement(RouterProvider, { router }));
	expect(
		await screen.findByRole("heading", { name: "Joueurs indisponibles" }),
	).toBeTruthy();
	expect(document.body.textContent).not.toContain("SQL AUTH SECRET");
	api.players.mockResolvedValue(dashboardFixture().players);
	fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
	expect(
		await screen.findByRole("heading", {
			name: "Joueurs",
		}),
	).toBeTruthy();
});
