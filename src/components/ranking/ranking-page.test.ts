// @vitest-environment jsdom
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
import { afterEach, describe, expect, it, vi } from "vitest";
import { rankingFixture } from "#/test-fixtures/ranking";
import { RankingPage } from "./ranking-page";
import type { RankingActions, RankingData } from "./types";

afterEach(cleanup);
function deferred() {
	let resolve: (value?: unknown) => void = () => {};
	let reject: (error: Error) => void = () => {};
	const promise = new Promise((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
function mount(
	data = rankingFixture(),
	overrides: Partial<RankingActions> = {},
) {
	const actions = {
		refresh: vi.fn().mockResolvedValue(undefined),
		correct: vi.fn().mockResolvedValue("saved"),
		...overrides,
	};
	const control = { update: (_data: RankingData) => {} };
	function Host() {
		const [snapshot, setSnapshot] = useState(data);
		control.update = setSnapshot;
		return createElement(RankingPage, { data: snapshot, actions });
	}
	render(createElement(Host));
	return { actions, control };
}
const history = () =>
	within(screen.getByRole("region", { name: "Historique des matchs" }));
const honours = () => within(screen.getByRole("region", { name: "Palmarès" }));
const table = () => within(screen.getByRole("table"));
function edit(round = 2, court = 1) {
	const details = history()
		.getByText(new RegExp(`^Rotation ${round}`))
		.closest("details");
	details?.setAttribute("open", "");
	const button = screen.getByRole("button", {
		name: `Modifier le score — rotation ${round}, terrain ${court}`,
	});
	fireEvent.click(button);
	return button;
}
function fill(first = "22", second = "19") {
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
function refresh() {
	fireEvent.click(screen.getByRole("button", { name: "Actualiser" }));
}
const inputValue = (team = 1) =>
	(screen.getByLabelText(`Score équipe ${team}`) as HTMLInputElement).value;

describe("official ranking and compact honours", () => {
	it("explains the empty ranking without inventing a podium", () => {
		mount(rankingFixture("empty"));
		expect(screen.getByText(/Le classement apparaîtra après/)).toBeTruthy();
		expect(screen.queryByRole("region", { name: "Palmarès" })).toBeNull();
		expect(screen.getByText(/Aucun match généré/)).toBeTruthy();
	});
	it("shows provisional status and the exact ranking explanation", () => {
		mount();
		expect(
			screen.getByText("Classement provisoire — matchs terminés uniquement."),
		).toBeTruthy();
		expect(screen.getByText(/Chaque joueur reçoit les points/)).toBeTruthy();
	});
	it("shows the closed status and retains correction actions", () => {
		mount(rankingFixture("closed"));
		expect(screen.getByText(/Tournoi terminé — les scores/)).toBeTruthy();
		expect(
			history().getAllByRole("button", { name: /Modifier le score/ }).length,
		).toBeGreaterThan(0);
	});
	it("groups 1,1,3,3 by official rank without a second place or a three-player cap", () => {
		mount();
		expect(honours().getByRole("region", { name: "Rang 1" })).toBeTruthy();
		expect(honours().queryByRole("region", { name: "Rang 2" })).toBeNull();
		expect(
			within(honours().getByRole("region", { name: "Rang 3" })).getAllByRole(
				"listitem",
			),
		).toHaveLength(2);
		expect(honours().getAllByText(/2 joueurs ex æquo/)).toHaveLength(2);
		expect(honours().getAllByRole("listitem")).toHaveLength(4);
	});
	it("honours all first-place ties even in a large group", () => {
		const data = rankingFixture();
		data.ranking = Array.from({ length: 12 }, (_, index) => ({
			...data.ranking[0],
			id: 100 + index,
			firstname: `Joueur ${index}`,
			ranking: 1,
		}));
		mount(data);
		expect(honours().getAllByRole("listitem")).toHaveLength(12);
		expect(honours().getByText(/12 joueurs ex æquo/)).toBeTruthy();
		expect(honours().queryByRole("region", { name: "Rang 3" })).toBeNull();
	});
	it("uses ranks rather than array indices for honours", () => {
		const data = rankingFixture();
		data.ranking.reverse();
		mount(data);
		expect(
			within(honours().getByRole("region", { name: "Rang 1" })).getByText(
				"Jean-Baptiste Alexandre de La Roche-Saint-André",
			),
		).toBeTruthy();
		expect(
			within(honours().getByRole("region", { name: "Rang 3" })).getByText(
				"Sacha Bernard",
			),
		).toBeTruthy();
	});
	it("preserves different official ranks for identical displayed rounded averages", () => {
		const data = rankingFixture();
		data.ranking = data.ranking.slice(0, 2).map((p, index) => ({
			...p,
			ranking: index + 1,
			averageScore: index === 0 ? 21.004 : 21.003,
			totalScore: index === 0 ? 21004 : 21003,
			playedGames: 1000,
		}));
		mount(data);
		const rows = table().getAllByRole("row").slice(1);
		expect(within(rows[0]).getAllByRole("cell")[0].textContent).toBe("1");
		expect(within(rows[1]).getAllByRole("cell")[0].textContent).toBe("2");
		expect(table().getAllByText("21,00")).toHaveLength(2);
	});
	it("keeps every server-ranked player, including players absent from current courts and resting lists", () => {
		const data = rankingFixture();
		data.round.matches = [];
		data.round.restingPlayers = [];
		mount(data);
		expect(table().getAllByRole("row")).toHaveLength(5);
		expect(table().getByText("Sacha Bernard")).toBeTruthy();
	});
	it("displays completed-match stats supplied by the server, independently of pending matches", () => {
		mount();
		const rows = table().getAllByRole("row").slice(1);
		expect(
			within(rows[0])
				.getAllByRole("cell")
				.map((e) => e.textContent),
		).toEqual(["1", "21,00", "2", "42"]);
		expect(
			screen.getByRole("list", { name: "Classement sur mobile" }),
		).toBeTruthy();
	});
});

describe("history by rotation", () => {
	it("retains earlier matches and opens only the most recent rotation initially", () => {
		mount();
		const details = [...document.querySelectorAll("details")];
		expect(details).toHaveLength(2);
		expect(details[0].open).toBe(true);
		expect(details[1].open).toBe(false);
		expect(details[0].textContent).toContain("Rotation 2");
		expect(details[1].textContent).toContain("Rotation 1");
	});
	it("shows explicit statuses and no result or correction action for waiting matches", () => {
		const data = rankingFixture("waiting");
		data.history[0].matches[0].team1[0].teamScore = 999;
		mount(data);
		const card = history().getByRole("article", {
			name: "Rotation 1, terrain 2",
		});
		expect(within(card).getByText("En attente de résultat")).toBeTruthy();
		expect(card.textContent).not.toContain("999");
		expect(within(card).queryByRole("button")).toBeNull();
		expect(screen.queryByRole("table")).toBeNull();
	});
	it("keeps the full long names and explicitly identifies teams and scores", () => {
		mount();
		const card = within(
			history().getByRole("article", { name: "Rotation 2, terrain 1" }),
		);
		expect(
			card.getByText(
				"Camille NomTrèsLongSansEspacesPourVérifierLeRetourÀLaLigne",
			),
		).toBeTruthy();
		expect(card.getByText("Équipe 1")).toBeTruthy();
		expect(card.getByText("Équipe 2")).toBeTruthy();
		expect(
			card.getByText(/Score équipe 1/).parentElement?.textContent,
		).toContain("21");
		expect(card.getByText("Terminé")).toBeTruthy();
	});
});

describe("isolated correction", () => {
	it("identifies the match, prefills scores, names fields and focuses the first score", async () => {
		mount();
		edit();
		expect(screen.getByRole("dialog").textContent).toContain(
			"rotation 2, terrain 1",
		);
		expect(inputValue()).toBe("21");
		expect(inputValue(2)).toBe("20");
		expect(
			screen.getByLabelText("Score équipe 1").getAttribute("inputmode"),
		).toBe("numeric");
		expect(
			screen.getByLabelText("Score équipe 1").getAttribute("aria-describedby"),
		).toContain("correction-team-1");
		await waitFor(() =>
			expect(document.activeElement).toBe(
				screen.getByLabelText("Score équipe 1"),
			),
		);
	});
	it("cancels without mutation and restores focus to its trigger", async () => {
		const { actions } = mount();
		const trigger = edit();
		fill();
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		await waitFor(() => expect(document.activeElement).toBe(trigger));
		expect(actions.correct).not.toHaveBeenCalled();
	});
	it("resets the draft on reopening and never carries values to another match", () => {
		mount();
		edit();
		fill("99", "88");
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		edit(1);
		expect(inputValue()).toBe("21");
		expect(inputValue(2)).toBe("20");
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		edit();
		expect(inputValue()).toBe("21");
	});
	it.each([
		["", "20"],
		["-1", "20"],
		["2.5", "20"],
	])("rejects invalid scores %j / %j", async (first, second) => {
		const { actions } = mount();
		edit();
		fill(first, second);
		submit();
		expect(await screen.findByText(/Saisissez un entier/)).toBeTruthy();
		expect(actions.correct).not.toHaveBeenCalled();
	});
	it("accepts 0–0 with no invented sport scoring rule and corrects a closed tournament", async () => {
		const { actions } = mount(rankingFixture("closed"));
		edit();
		fill("0", "0");
		submit();
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(actions.correct).toHaveBeenCalledWith(
			expect.objectContaining({ id: 21, status: "finished" }),
			2,
			{ scoreTeam1: 0, scoreTeam2: 0 },
		);
		expect(actions.refresh).toHaveBeenCalledTimes(1);
	});
	it("prevents duplicate corrections and closing during the request", async () => {
		const pending = deferred();
		const { actions } = mount(undefined, {
			correct: vi.fn(() => pending.promise as Promise<"saved">),
		});
		edit();
		fill();
		submit();
		submit();
		expect(actions.correct).toHaveBeenCalledTimes(1);
		expect(
			screen
				.getByRole("button", { name: "Enregistrement…" })
				.hasAttribute("disabled"),
		).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		expect(screen.getByRole("dialog")).toBeTruthy();
		await act(async () => pending.resolve("saved"));
	});
	it("retains a safe retry draft without exposing technical errors", async () => {
		const { actions } = mount(undefined, {
			correct: vi.fn().mockResolvedValue("retry"),
		});
		edit();
		fill();
		submit();
		await screen.findByText(/Aucun score n'a été envoyé/);
		expect(inputValue()).toBe("22");
		expect(inputValue(2)).toBe("19");
		expect(
			screen
				.getByRole("button", { name: "Enregistrer la correction" })
				.hasAttribute("disabled"),
		).toBe(false);
		expect(actions.refresh).not.toHaveBeenCalled();
	});
	it.each([
		"conflict",
		"uncertain",
	] as const)("requires refresh after %s, with a refresh action available inside the dialog", async (result) => {
		const { actions } = mount(undefined, {
			correct: vi.fn().mockResolvedValue(result),
		});
		edit();
		fill();
		submit();
		await screen.findByText(/Actualisation nécessaire :/);
		expect(
			screen
				.getByRole("button", { name: "Enregistrer la correction" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(
			screen
				.getByRole("button", { name: "Actualiser les données" })
				.hasAttribute("disabled"),
		).toBe(false);
		submit();
		expect(actions.correct).toHaveBeenCalledTimes(1);
		fireEvent.click(
			screen.getByRole("button", { name: "Actualiser les données" }),
		);
		await waitFor(() =>
			expect(
				screen
					.getByRole("button", { name: "Enregistrer la correction" })
					.hasAttribute("disabled"),
			).toBe(false),
		);
		expect(inputValue()).toBe("22");
	});
	it("handles an unexpected failure as uncertain without exposing raw server details", async () => {
		mount(undefined, {
			correct: vi.fn().mockRejectedValue(new Error("SQL AUTH SECRET")),
		});
		edit();
		fill();
		submit();
		await screen.findByText(/Actualisation nécessaire :/);
		expect(document.body.textContent).not.toContain("SQL AUTH SECRET");
	});
	it("locks corrections after a confirmed save whose refresh failed", async () => {
		mount(undefined, {
			refresh: vi.fn().mockRejectedValue(new Error("offline")),
		});
		edit();
		fill();
		submit();
		await screen.findByText(/Le score est corrigé, mais/);
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.getByText("19:00:00")).toBeTruthy();
		expect(
			screen
				.getByRole("button", {
					name: "Modifier le score — rotation 2, terrain 1",
				})
				.hasAttribute("disabled"),
		).toBe(true);
	});
	it("reflects new official ranks and history together after correction", async () => {
		const { control } = mount(undefined, {
			refresh: vi.fn(async () => {
				const fresh = rankingFixture();
				fresh.loadedAt += 60000;
				fresh.ranking = [...fresh.ranking]
					.reverse()
					.map((p, index) => ({ ...p, ranking: index + 1 }));
				fresh.history[1].matches[0].team1 =
					fresh.history[1].matches[0].team1.map((p) => ({
						...p,
						teamScore: 22,
					}));
				control.update(fresh);
			}),
		});
		edit();
		fill();
		submit();
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		const first = table().getAllByRole("row")[1];
		expect(first.textContent).toContain("Sacha Bernard");
		expect(screen.getByText("19:01:00")).toBeTruthy();
		expect(
			within(
				history().getByRole("article", { name: "Rotation 2, terrain 1" }),
			).getByText(/Score équipe 1/).parentElement?.textContent,
		).toContain("22");
	});
});

describe("manual refresh while editing", () => {
	it("preserves a valid draft and advances the timestamp only after successful refresh", async () => {
		const pending = deferred();
		const { control } = mount(undefined, {
			refresh: vi.fn(() => pending.promise),
		});
		edit();
		fill("24", "22");
		fireEvent.click(
			screen.getByRole("button", { name: "Actualiser les données" }),
		);
		expect(
			screen
				.getByRole("button", { name: "Actualisation…" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(inputValue()).toBe("24");
		await act(async () => {
			const fresh = rankingFixture();
			fresh.loadedAt += 60000;
			control.update(fresh);
			pending.resolve();
		});
		expect(inputValue()).toBe("24");
		expect(screen.getByText("19:01:00")).toBeTruthy();
	});
	it("shows a refresh failure inside the dialog and preserves the draft and timestamp", async () => {
		mount(undefined, {
			refresh: vi.fn().mockRejectedValue(new Error("SQL ERROR")),
		});
		edit();
		fill();
		fireEvent.click(
			screen.getByRole("button", { name: "Actualiser les données" }),
		);
		await within(screen.getByRole("dialog")).findByText(
			/Actualisation impossible/,
		);
		expect(inputValue()).toBe("22");
		expect(screen.getByText("19:00:00")).toBeTruthy();
		expect(document.body.textContent).not.toContain("SQL ERROR");
	});
	it("blocks a stale draft when a different score arrives and reloads fresh scores on reopening", async () => {
		const { control, actions } = mount();
		edit();
		fill("24", "22");
		const fresh = rankingFixture();
		fresh.history[1].matches[0].team1 = fresh.history[1].matches[0].team1.map(
			(p) => ({ ...p, teamScore: 25 }),
		);
		await act(async () => control.update(fresh));
		expect(screen.getByText(/Le match a été modifié depuis/)).toBeTruthy();
		expect(inputValue()).toBe("24");
		submit();
		expect(actions.correct).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		edit();
		expect(inputValue()).toBe("25");
	});
	it("blocks a draft when its match is removed during refresh", async () => {
		const { control } = mount();
		edit();
		const fresh = rankingFixture();
		fresh.history = [];
		await act(async () => control.update(fresh));
		expect(screen.getByText(/Le match a été modifié depuis/)).toBeTruthy();
		expect(
			screen
				.getByRole("button", { name: "Enregistrer la correction" })
				.hasAttribute("disabled"),
		).toBe(true);
	});
	it("retains prior results and timestamp after a failed page refresh", async () => {
		mount(undefined, {
			refresh: vi.fn().mockRejectedValue(new Error("offline")),
		});
		refresh();
		await screen.findByText(/Actualisation impossible/);
		expect(screen.getByText("19:00:00")).toBeTruthy();
		expect(table().getAllByRole("row")).toHaveLength(5);
	});
});
