// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Exercise the real generated routes and navigation, without any database access.
vi.mock("#/server/functions/tournaments", () => ({
	getCurrentRoundData: async () => ({
		currentRound: 0,
		availableCourts: 4,
		roundType: "infinite",
		maxRounds: 0,
		maximizeParity: false,
		status: "active",
		matches: [],
		restingPlayers: [],
		roundRobinProgress: null,
	}),
	getRoundRobinSchedule: async () => ({
		rounds: [],
		remainingRounds: null,
		partial: false,
		message: "Mode libre : arrêt manuel.",
	}),
	getRankingData: async () => [],
	getMatchHistory: async () => [],
	finishTournament: vi.fn(),
	startNextRound: vi.fn(),
	submitMatchScore: vi.fn(),
	updateMatchScore: vi.fn(),
	resetTournament: vi.fn(),
	updateTournamentSettings: vi.fn(),
}));
vi.mock("#/server/functions/players", () => ({
	getPlayers: async () => [],
	createPlayer: vi.fn(),
	deletePlayer: vi.fn(),
	togglePlayerPresence: vi.fn(),
}));

// Mount the real generated child routes in a DOM test, without the SSR-only
// <html>/Scripts shell. The actual document is checked on the local server.
vi.mock("#/routes/__root", async () => {
	const { createRootRouteWithContext } = await import("@tanstack/react-router");
	return {
		Route: createRootRouteWithContext<{ queryClient: QueryClient }>()({}),
	};
});

import { routeTree } from "#/routeTree.gen";

// jsdom has no scrolling implementation; navigation is tested independently.
beforeAll(() => {
	window.scrollTo = vi.fn();
});
afterEach(cleanup);

async function open(path: string) {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
		context: { queryClient: new QueryClient() },
		defaultPendingMs: 0,
	});
	await router.load();
	render(createElement(RouterProvider, { router }));
	return router;
}

const destinations = [
	["/", "Tournoi", "Tournoi"],
	["/joueurs", "Joueurs", "Joueurs"],
	["/classement", "Classement", "Classement"],
	["/reglages", "Réglages", "Réglages du Tournoi"],
] as const;

describe("canonical routes and shared navigation", () => {
	for (const [path, label, heading] of destinations)
		it(`${path} renders its page and marks only its own navigation entry`, async () => {
			await open(path);
			expect(screen.getAllByRole("main")).toHaveLength(1);
			expect(
				within(screen.getByRole("main")).getByRole("heading", {
					level: 1,
					name: heading,
				}),
			).toBeTruthy();
			for (const name of ["Navigation principale", "Navigation mobile"]) {
				const nav = screen.getByRole("navigation", { name });
				expect(within(nav).getAllByRole("link")).toHaveLength(4);
				expect(
					within(nav)
						.getAllByRole("link")
						.filter((link) => link.getAttribute("aria-current") === "page"),
				).toHaveLength(1);
				expect(
					within(nav)
						.getByRole("link", { name: label })
						.getAttribute("aria-current"),
				).toBe("page");
			}
			expect(
				screen
					.getByRole("link", { name: "Aller au contenu" })
					.getAttribute("href"),
			).toBe("#contenu-principal");
		});
	it("intercepts internal links and updates the active page through the router", async () => {
		const router = await open("/");
		const nav = screen.getByRole("navigation", {
			name: "Navigation principale",
		});
		const link = within(nav).getByRole("link", {
			name: "Joueurs",
		});
		expect(link.getAttribute("href")).toBe("/joueurs");
		expect(fireEvent.click(link)).toBe(false);
		await waitFor(() =>
			expect(router.state.location.pathname).toBe("/joueurs"),
		);
		await waitFor(() => expect(link.getAttribute("aria-current")).toBe("page"));
		expect(
			within(nav)
				.getByRole("link", { name: "Tournoi" })
				.hasAttribute("aria-current"),
		).toBe(false);
	});
});

describe("legacy bookmarks", () => {
	for (const [oldPath, newPath] of [
		["/admin", "/"],
		["/admin/", "/"],
		["/admin/players", "/joueurs"],
		["/admin/ranking", "/classement"],
		["/admin/settings", "/reglages"],
	]) {
		it(`${oldPath} redirects to ${newPath} with a single shared layout`, async () => {
			const router = await open(oldPath);
			expect(router.state.location.pathname).toBe(newPath);
			expect(screen.getAllByRole("main")).toHaveLength(1);
			expect(screen.queryByText("Welcome to TanStack Start")).toBeNull();
		});
	}
});
