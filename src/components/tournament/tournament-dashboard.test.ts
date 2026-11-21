// @vitest-environment jsdom
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { createElement, useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { dashboardFixture } from "#/test-fixtures/dashboard";
import { TournamentDashboard } from "./tournament-dashboard";
import type { DashboardActions, DashboardData, ScoreResult } from "./types";

beforeAll(() => {
	window.scrollTo = vi.fn();
});
afterEach(cleanup);
function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (error: Error) => void = () => {};
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
async function mount(
	data = dashboardFixture(),
	overrides: Partial<DashboardActions> = {},
) {
	const actions = {
		refresh: vi.fn().mockResolvedValue(undefined),
		generate: vi.fn().mockResolvedValue(undefined),
		finish: vi.fn().mockResolvedValue(undefined),
		saveScore: vi.fn().mockResolvedValue("saved" as ScoreResult),
		...overrides,
	};
	const control = { update: (_data: DashboardData) => {} };
	function Host() {
		const [snapshot, setSnapshot] = useState(data);
		control.update = setSnapshot;
		return createElement(TournamentDashboard, { data: snapshot, actions });
	}
	const route = createRootRoute({ component: Host });
	const router = createRouter({
		routeTree: route,
		history: createMemoryHistory({ initialEntries: ["/"] }),
		defaultPendingMs: 0,
	});
	await router.load();
	render(createElement(RouterProvider, { router }));
	return { actions, control };
}
const court = (number: number) =>
	within(screen.getByRole("article", { name: `Terrain ${number}` }));
function open(number = 2) {
	fireEvent.click(
		court(number).getByRole("button", { name: "Saisir le score" }),
	);
}
function fill(first = "21", second = "0") {
	fireEvent.change(screen.getByLabelText("Score équipe 1"), {
		target: { value: first },
	});
	fireEvent.change(screen.getByLabelText("Score équipe 2"), {
		target: { value: second },
	});
}
function submit() {
	fireEvent.submit(screen.getByRole("form"));
}

describe("preparation and actual match states", () => {
	it("allows an empty numbered rotation to continue when no result is pending", async () => {
		const data = dashboardFixture();
		data.round.matches = [];
		const { actions } = await mount(data);
		expect(screen.getByText(/Aucun match dans cette rotation/)).toBeTruthy();
		const generate = screen.getByRole("button", {
			name: "Générer la rotation suivante",
		});
		expect(generate.hasAttribute("disabled")).toBe(false);
		expect(
			screen
				.getByRole("button", { name: "Terminer le tournoi" })
				.hasAttribute("disabled"),
		).toBe(false);
		fireEvent.click(generate);
		await waitFor(() => expect(actions.generate).toHaveBeenCalledTimes(1));
	});
	it("guides preparation and prevents launch with fewer than four present players", async () => {
		const { actions } = await mount(dashboardFixture("insufficient"));
		expect(screen.getByText(/Il faut au moins quatre/)).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Gérer les joueurs" })
				.getAttribute("href"),
		).toBe("/joueurs");
		expect(
			screen
				.getByRole("link", { name: "Modifier les réglages" })
				.getAttribute("href"),
		).toBe("/reglages");
		const button = screen.getByRole("button", {
			name: "Lancer la première rotation",
		});
		expect(button.hasAttribute("disabled")).toBe(true);
		fireEvent.click(button);
		expect(actions.generate).not.toHaveBeenCalled();
	});
	it("displays actual courts and progress using statuses, never pending zero scores", async () => {
		const fixture = dashboardFixture();
		fixture.round.matches[1].team1.forEach((p) => {
			p.teamScore = 21;
		});
		await mount(fixture);
		expect(screen.getAllByRole("article")).toHaveLength(3);
		expect(screen.queryByRole("article", { name: "Terrain 4" })).toBeNull();
		const progress = screen.getByRole("progressbar", {
			name: "Résultats de la rotation 3",
		});
		expect(progress.getAttribute("value")).toBe("1");
		expect(progress.getAttribute("max")).toBe("3");
		expect(court(1).getByText("Terminé")).toBeTruthy();
		expect(
			court(1).queryByRole("button", { name: "Saisir le score" }),
		).toBeNull();
		expect(
			court(2).getByRole("button", { name: "Saisir le score" }),
		).toBeTruthy();
		expect(court(2).queryByText("0")).toBeNull();
		expect(court(2).queryByText("21")).toBeNull();
		expect(screen.getByText(/terrains 2, 3/)).toBeTruthy();
		expect(
			screen.getByText("Jean-Baptiste Alexandre de La Roche-Saint-André"),
		).toBeTruthy();
	});
	it("blocks both the next rotation and closure until scores are complete", async () => {
		const { actions } = await mount();
		const generate = screen.getByRole("button", {
				name: "Générer la rotation suivante",
			}),
			finish = screen.getByRole("button", { name: "Terminer le tournoi" });
		expect(generate.hasAttribute("disabled")).toBe(true);
		expect(finish.hasAttribute("disabled")).toBe(true);
		fireEvent.click(generate);
		fireEvent.click(finish);
		expect(actions.generate).not.toHaveBeenCalled();
		expect(actions.finish).not.toHaveBeenCalled();
	});
	it("keeps a closed tournament closed even without any generated round", async () => {
		const fixture = dashboardFixture("preparation");
		fixture.round.status = "finished";
		await mount(fixture);
		expect(
			screen.getByRole("heading", { name: "Tournoi clôturé" }),
		).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Lancer la première rotation" }),
		).toBeNull();
	});
});

describe("isolated score entry", () => {
	it("resets values when switching cards or cancelling and focuses the first input", async () => {
		await mount();
		open(2);
		expect(document.activeElement).toBe(
			screen.getByLabelText("Score équipe 1"),
		);
		fill("12", "9");
		open(3);
		expect(
			(screen.getByLabelText("Score équipe 1") as HTMLInputElement).value,
		).toBe("");
		fill("7", "8");
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		open(2);
		expect(
			(screen.getByLabelText("Score équipe 2") as HTMLInputElement).value,
		).toBe("");
	});
	for (const [a, b] of [
		["", "1"],
		["-1", "4"],
		["1.5", "3"],
	])
		it(`validates ${a}/${b} without calling the server`, async () => {
			const { actions } = await mount();
			open();
			fill(a, b);
			submit();
			expect(screen.getByRole("alert").textContent).toContain("entier");
			expect(actions.saveScore).not.toHaveBeenCalled();
		});
	it("submits a valid draw including zero, then clears the form", async () => {
		const { actions } = await mount();
		open();
		fill("0", "0");
		submit();
		await waitFor(() => expect(actions.saveScore).toHaveBeenCalledOnce());
		expect(vi.mocked(actions.saveScore).mock.calls[0][2]).toEqual({
			scoreTeam1: 0,
			scoreTeam2: 0,
		});
		await waitFor(() => expect(screen.queryByRole("form")).toBeNull());
		expect(screen.getByRole("status").textContent).toContain(
			"terrain 2 enregistré",
		);
	});
	it("prevents double submission and changing match while saving", async () => {
		const gate = deferred<ScoreResult>();
		const save = vi.fn(() => gate.promise);
		await mount(undefined, { saveScore: save });
		open();
		fill();
		submit();
		submit();
		expect(save).toHaveBeenCalledOnce();
		expect(
			screen
				.getByRole("button", { name: "Enregistrement…" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(
			court(3)
				.getByRole("button", { name: "Saisir le score" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(
			screen.getByRole("button", { name: "Annuler" }).hasAttribute("disabled"),
		).toBe(true);
		await act(async () => {
			gate.resolve("saved");
			await gate.promise;
		});
	});
	it("preserves values on recoverable failure and allows retry without exposing errors", async () => {
		const save = vi
			.fn()
			.mockResolvedValueOnce("retry")
			.mockResolvedValueOnce("saved");
		await mount(undefined, { saveScore: save });
		open();
		fill("15", "20");
		submit();
		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain("réessayer"),
		);
		expect(
			(screen.getByLabelText("Score équipe 1") as HTMLInputElement).value,
		).toBe("15");
		submit();
		await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
	});
	for (const result of ["conflict", "uncertain"] as const)
		it(`requires refresh after ${result} and never resubmits stale values`, async () => {
			const save = vi.fn().mockResolvedValue(result);
			await mount(undefined, { saveScore: save });
			open();
			fill();
			submit();
			await waitFor(() =>
				expect(screen.getByRole("alert").textContent).toContain("Actualisez"),
			);
			submit();
			expect(save).toHaveBeenCalledOnce();
			expect(
				screen
					.getByRole("button", { name: "Actualiser" })
					.hasAttribute("disabled"),
			).toBe(false);
		});
	it("hides technical errors and locks an unexpected write failure", async () => {
		await mount(undefined, {
			saveScore: vi.fn().mockRejectedValue(new Error("SQL authToken secret")),
		});
		open();
		fill();
		submit();
		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain("confirmé"),
		);
		expect(document.body.textContent).not.toContain("SQL authToken");
	});
	it("does not offer a second POST when the score succeeded but refresh failed", async () => {
		const save = vi.fn().mockResolvedValue("saved");
		await mount(undefined, {
			saveScore: save,
			refresh: vi.fn().mockRejectedValue(new Error("offline")),
		});
		open();
		fill();
		submit();
		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain(
				"Le score est enregistré",
			),
		);
		expect(screen.queryByRole("form")).toBeNull();
		expect(
			court(2)
				.getByRole("button", { name: "Saisir le score" })
				.hasAttribute("disabled"),
		).toBe(true);
	});
});

describe("refresh and cross-device changes", () => {
	it("keeps a valid draft during refresh and timestamps only successful new data", async () => {
		const gate = deferred<void>();
		let update = (data: DashboardData) => {
			void data;
		};
		const fixture = dashboardFixture();
		const refreshed = { ...fixture, loadedAt: fixture.loadedAt + 60000 };
		const { control } = await mount(fixture, {
			refresh: async () => {
				await gate.promise;
				update(refreshed);
			},
		});
		update = control.update;
		open();
		fill("12", "11");
		const previous = screen.getByText(/Actualisé à/).textContent;
		fireEvent.click(screen.getByRole("button", { name: "Actualiser" }));
		expect(
			screen
				.getByRole("button", { name: "Actualisation…" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(screen.getByText(/Actualisé à/).textContent).toBe(previous);
		await act(async () => {
			gate.resolve();
			await gate.promise;
		});
		expect(
			(screen.getByLabelText("Score équipe 1") as HTMLInputElement).value,
		).toBe("12");
		expect(screen.getByText(/Actualisé à/).textContent).not.toBe(previous);
	});
	it("keeps the last successful timestamp and draft after a failed refresh", async () => {
		await mount(undefined, {
			refresh: vi.fn().mockRejectedValue(new Error("SQL details")),
		});
		open();
		fill("13", "14");
		const before = screen.getByText(/Actualisé à/).textContent;
		fireEvent.click(screen.getByRole("button", { name: "Actualiser" }));
		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain(
				"Actualisation impossible",
			),
		);
		expect(screen.getByText(/Actualisé à/).textContent).toBe(before);
		expect(
			(screen.getByLabelText("Score équipe 2") as HTMLInputElement).value,
		).toBe("14");
		expect(document.body.textContent).not.toContain("SQL details");
	});
	it("discards the editor if refresh reveals that another device finished its match", async () => {
		const { control, actions } = await mount();
		open();
		fill();
		const changed = dashboardFixture();
		changed.round.matches[1].status = "finished";
		await act(async () => control.update(changed));
		expect(screen.queryByRole("form")).toBeNull();
		expect(court(2).getByText("Terminé")).toBeTruthy();
		expect(actions.saveScore).not.toHaveBeenCalled();
	});
});

describe("generation and closure", () => {
	it("blocks repeated generation and refresh while the first request is pending", async () => {
		const gate = deferred<void>(),
			generate = vi.fn(() => gate.promise);
		await mount(dashboardFixture("preparation"), { generate });
		const button = screen.getByRole("button", {
			name: "Lancer la première rotation",
		});
		fireEvent.click(button);
		fireEvent.click(button);
		expect(generate).toHaveBeenCalledOnce();
		expect(
			screen
				.getByRole("button", { name: "Génération…" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(
			screen
				.getByRole("button", { name: "Actualiser" })
				.hasAttribute("disabled"),
		).toBe(true);
		await act(async () => {
			gate.resolve();
			await gate.promise;
		});
	});
	it("offers reconciliation after a generation failure", async () => {
		await mount(dashboardFixture("complete"), {
			generate: vi.fn().mockRejectedValue(new Error("SQL error")),
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Générer la rotation suivante" }),
		);
		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain("Actualisez"),
		);
		expect(document.body.textContent).not.toContain("SQL error");
	});
	it("confirms closure, prevents duplicate requests and keeps the loading state", async () => {
		const gate = deferred<void>(),
			finish = vi.fn(() => gate.promise);
		await mount(dashboardFixture("complete"), { finish });
		fireEvent.click(
			screen.getByRole("button", { name: "Terminer le tournoi" }),
		);
		expect(finish).not.toHaveBeenCalled();
		const confirm = screen.getByRole("button", {
			name: "Confirmer la clôture",
		});
		fireEvent.click(confirm);
		fireEvent.click(confirm);
		expect(finish).toHaveBeenCalledOnce();
		expect(
			screen.getByRole("button", { name: "Clôture…" }).hasAttribute("disabled"),
		).toBe(true);
		await act(async () => {
			gate.resolve();
			await gate.promise;
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});
	it("closes a failed confirmation so the user can refresh", async () => {
		await mount(dashboardFixture("complete"), {
			finish: vi.fn().mockRejectedValue(new Error("offline")),
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Terminer le tournoi" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Confirmer la clôture" }),
		);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(
			screen
				.getByRole("button", { name: "Actualiser" })
				.hasAttribute("disabled"),
		).toBe(false);
	});
	it("does not promise complete Round-Robin coverage in a partial forecast", async () => {
		await mount(dashboardFixture("roundrobin"));
		expect(
			screen.getByText(/Seuls les matchs terminés comptent/).textContent,
		).toContain("couverture complète n'est pas garantie");
		expect(screen.getByText(/Au repos/)).toBeTruthy();
		expect(screen.queryByText("Camille 15 Martin")).toBeNull();
	});
});
