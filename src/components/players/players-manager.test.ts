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
import { playersFixture } from "#/test-fixtures/players";
import { PlayersManager } from "./players-manager";
import { type PlayersActions, type PlayersData, validatePlayer } from "./types";

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
	data = playersFixture(),
	overrides: Partial<PlayersActions> = {},
) {
	const actions = {
		refresh: vi.fn().mockResolvedValue(undefined),
		add: vi.fn().mockResolvedValue(undefined),
		presence: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
	const control = { update: (_data: PlayersData) => {} };
	function Host() {
		const [snapshot, setSnapshot] = useState(data);
		control.update = setSnapshot;
		return createElement(PlayersManager, { data: snapshot, actions });
	}
	render(createElement(Host));
	return { actions, control };
}
const row = (id = 1) =>
	within(
		screen.getByRole("listitem", {
			name:
				id === 1
					? "Jean-Baptiste Alexandre de La Roche-Saint-André"
					: id === 2
						? "Camille NomTrèsLongSansEspacesPourVérifierLeRetourÀLaLigne"
						: "Alex Martin",
		}),
	);
const presence = (id = 1) => row(id).getByRole("switch");
function fill(firstname = "Lou", lastname = "Durand") {
	fireEvent.change(screen.getByLabelText("Prénom", { exact: true }), {
		target: { value: firstname },
	});
	fireEvent.change(screen.getByLabelText("Nom (facultatif)", { exact: true }), {
		target: { value: lastname },
	});
}
function submit() {
	fireEvent.submit(screen.getByRole("form", { name: "Ajouter un joueur" }));
}
function refresh() {
	fireEvent.click(screen.getByRole("button", { name: "Actualiser" }));
}
function deletion(id = 3) {
	fireEvent.click(row(id).getByRole("button", { name: /Supprimer/ }));
	return screen.getByRole("button", { name: "Confirmer la suppression" });
}

describe("list, counters and accessible controls", () => {
	it("renders full names, accurate counters and assigned participation wording", () => {
		mount();
		expect(screen.getAllByRole("definition")).toHaveLength(3);
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		expect(
			screen.getByText(
				"Camille NomTrèsLongSansEspacesPourVérifierLeRetourÀLaLigne",
			),
		).toBeTruthy();
	});
	it("counts all players independently of a case-insensitive local search", () => {
		const { actions } = mount();
		const stats = screen.getByLabelText("Résumé des inscriptions");
		expect(stats.textContent).toContain("Inscrits3");
		expect(stats.textContent).toContain("Présents2");
		expect(stats.textContent).toContain("Absents1");
		fireEvent.change(screen.getByLabelText("Rechercher un joueur"), {
			target: { value: "ROCHE" },
		});
		expect(screen.getAllByRole("listitem")).toHaveLength(1);
		expect(
			screen.getByText("Jean-Baptiste Alexandre de La Roche-Saint-André"),
		).toBeTruthy();
		expect(actions.refresh).not.toHaveBeenCalled();
		expect(stats.textContent).toContain("Inscrits3");
	});
	it("names switches, shows text statuses and never calls assignments completed matches", () => {
		mount();
		expect(presence().getAttribute("aria-label")).toBe(
			"Présence de Jean-Baptiste Alexandre de La Roche-Saint-André",
		);
		expect(presence().getAttribute("aria-checked")).toBe("true");
		expect(presence(2).getAttribute("aria-checked")).toBe("false");
		expect(row().getByText("Présent")).toBeTruthy();
		expect(row(2).getByText("Absent")).toBeTruthy();
		expect(row().getByText(/Participations attribuées/).textContent).toContain(
			"3",
		);
		expect(screen.queryByText(/Matchs terminés/)).toBeNull();
	});
	it("explains the empty list", () => {
		const data = playersFixture();
		data.players = [];
		mount(data);
		expect(
			screen.getByText(/Aucun joueur inscrit pour le moment/),
		).toBeTruthy();
		expect(screen.queryByLabelText("Rechercher un joueur")).toBeNull();
	});
	it("explains why all-absent players cannot play", () => {
		const data = playersFixture();
		data.players.forEach((p) => {
			p.present = false;
		});
		mount(data);
		expect(screen.getByText(/Aucun joueur présent/)).toBeTruthy();
	});
	it("distinguishes no search results from an empty tournament", () => {
		mount();
		fireEvent.change(screen.getByLabelText("Rechercher un joueur"), {
			target: { value: "inconnu" },
		});
		expect(screen.getByText(/Aucun joueur ne correspond/)).toBeTruthy();
	});
});

describe("addition", () => {
	it.each([
		"",
		"A",
	])("rejects invalid firstname %j next to its labelled input", (firstname) => {
		const { actions } = mount();
		fill(firstname);
		submit();
		expect(screen.getByText(/au moins 2 caractères/).getAttribute("role")).toBe(
			"alert",
		);
		expect(screen.getByLabelText("Prénom").getAttribute("aria-invalid")).toBe(
			"true",
		);
		expect(actions.add).not.toHaveBeenCalled();
	});
	it("uses the same name limits as the server and allows optional lastname", () => {
		expect(
			validatePlayer({
				firstname: "A".repeat(51),
				lastname: "B".repeat(51),
				gender: "M",
			}),
		).toEqual({
			firstname: "Le prénom doit contenir au maximum 50 caractères.",
			lastname: "Le nom doit contenir au maximum 50 caractères.",
		});
		expect(
			validatePlayer({ firstname: "Li", lastname: "", gender: "M" }),
		).toEqual({ firstname: "", lastname: "" });
	});
	it("adds with optional surname, refreshes, clears fields and refocuses firstname", async () => {
		const { actions } = mount();
		fill("Léa", "");
		fireEvent.change(screen.getByLabelText("Genre"), {
			target: { value: "F" },
		});
		submit();
		await waitFor(() =>
			expect(screen.getByLabelText("Prénom").getAttribute("value")).toBe(""),
		);
		expect(actions.add).toHaveBeenCalledWith({
			firstname: "Léa",
			lastname: "",
			gender: "F",
		});
		expect(actions.refresh).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(screen.getByLabelText("Prénom"));
		expect(screen.getByRole("status").textContent).toContain("ajouté");
		expect((screen.getByLabelText("Genre") as HTMLSelectElement).value).toBe(
			"F",
		);
	});
	it("prevents duplicate submits and freezes the submitted names while adding", async () => {
		const pending = deferred();
		const { actions } = mount(undefined, { add: vi.fn(() => pending.promise) });
		fill();
		submit();
		submit();
		expect(actions.add).toHaveBeenCalledTimes(1);
		expect(
			screen
				.getByRole("button", { name: "Ajout en cours…" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect((screen.getByLabelText("Prénom") as HTMLInputElement).readOnly).toBe(
			true,
		);
		await act(async () => pending.resolve());
	});
	it("preserves failed values, hides technical details and requires a successful refresh before retry", async () => {
		const { actions } = mount(undefined, {
			add: vi.fn().mockRejectedValue(new Error("SQL TOKEN SECRET")),
		});
		fill();
		submit();
		await screen.findByText(/Ajout non confirmé/);
		expect((screen.getByLabelText("Prénom") as HTMLInputElement).value).toBe(
			"Lou",
		);
		expect(
			(screen.getByLabelText("Nom (facultatif)") as HTMLInputElement).value,
		).toBe("Durand");
		expect(document.body.textContent).not.toContain("SQL TOKEN SECRET");
		expect(
			screen
				.getByRole("button", { name: "Ajouter le joueur" })
				.hasAttribute("disabled"),
		).toBe(true);
		refresh();
		await screen.findByText(/Vérifiez si le joueur est déjà inscrit/);
		expect(
			screen
				.getByRole("button", { name: "Ajouter le joueur" })
				.hasAttribute("disabled"),
		).toBe(false);
		expect(actions.add).toHaveBeenCalledTimes(1);
	});
	it("clears confirmed additions even if the following refresh fails", async () => {
		mount(undefined, {
			refresh: vi.fn().mockRejectedValue(new Error("offline")),
		});
		fill();
		submit();
		await screen.findByText(/Le joueur est ajouté, mais/);
		expect((screen.getByLabelText("Prénom") as HTMLInputElement).value).toBe(
			"",
		);
		expect(
			screen
				.getByRole("button", { name: "Ajouter le joueur" })
				.hasAttribute("disabled"),
		).toBe(true);
	});
});

describe("presence and concurrency", () => {
	it("keeps the last confirmed state until the server and refresh complete", async () => {
		const pending = deferred();
		const { actions, control } = mount(undefined, {
			presence: vi.fn(() => pending.promise),
		});
		fireEvent.click(presence());
		expect(presence().getAttribute("aria-checked")).toBe("true");
		expect(screen.getByText("Mise à jour de la présence…")).toBeTruthy();
		await act(async () => {
			pending.resolve();
		});
		expect(actions.presence).toHaveBeenCalledWith(1, false);
		expect(actions.refresh).toHaveBeenCalledTimes(1);
		const fresh = playersFixture();
		fresh.players[0].present = false;
		await act(async () => control.update(fresh));
		expect(presence().getAttribute("aria-checked")).toBe("false");
	});
	it("prevents repeat presence changes and concurrent delete/refresh during a mutation", async () => {
		const pending = deferred();
		const { actions } = mount(undefined, {
			presence: vi.fn(() => pending.promise),
		});
		fireEvent.click(presence());
		fireEvent.click(presence());
		fireEvent.click(row().getByRole("button", { name: /Supprimer/ }));
		refresh();
		expect(actions.presence).toHaveBeenCalledTimes(1);
		expect(actions.remove).not.toHaveBeenCalled();
		expect(actions.refresh).not.toHaveBeenCalled();
		expect(screen.queryByRole("dialog")).toBeNull();
		await act(async () => pending.resolve());
	});
	it("preserves state on failure and locks only the affected player until refresh", async () => {
		mount(undefined, {
			presence: vi.fn().mockRejectedValue(new Error("SQL SECRET")),
		});
		fireEvent.click(presence());
		await screen.findByText(/Présence non confirmée/);
		expect(presence().getAttribute("aria-checked")).toBe("true");
		expect(presence().hasAttribute("disabled")).toBe(true);
		expect(presence(2).hasAttribute("disabled")).toBe(false);
		expect(document.body.textContent).not.toContain("SQL SECRET");
		refresh();
		await screen.findByText(/Les données ont été relues/);
		expect(presence().hasAttribute("disabled")).toBe(false);
	});
	it("locks the row after a confirmed change whose refresh fails", async () => {
		mount(undefined, {
			refresh: vi.fn().mockRejectedValue(new Error("offline")),
		});
		fireEvent.click(presence());
		await screen.findByText(/Modification confirmée, mais/);
		expect(presence().hasAttribute("disabled")).toBe(true);
	});
	it("adopts a different confirmed presence returned by another device", async () => {
		const { control } = mount();
		const fresh = playersFixture();
		fresh.players[1].present = true;
		await act(async () => control.update(fresh));
		expect(presence(2).getAttribute("aria-checked")).toBe("true");
	});
});

describe("protected deletion", () => {
	it("asks confirmation with the exact player name, and restores focus on cancellation", async () => {
		const { actions } = mount();
		deletion();
		expect(screen.getByRole("dialog").textContent).toContain(
			"Supprimer Alex Martin ?",
		);
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		await waitFor(() =>
			expect(document.activeElement).toBe(
				row(3).getByRole("button", { name: /Supprimer/ }),
			),
		);
		expect(actions.remove).not.toHaveBeenCalled();
	});
	it("deletes only after confirmation and refreshes the list", async () => {
		const { actions } = mount();
		fireEvent.click(deletion());
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(actions.remove).toHaveBeenCalledWith(3);
		expect(actions.refresh).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("status").textContent).toContain("supprimé");
	});
	it("prevents repeat confirmations and blocks closing while deletion is pending", async () => {
		const pending = deferred();
		const { actions } = mount(undefined, {
			remove: vi.fn(() => pending.promise),
		});
		const button = deletion();
		fireEvent.click(button);
		fireEvent.click(button);
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		expect(actions.remove).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(
			screen
				.getByRole("button", { name: "Suppression…" })
				.hasAttribute("disabled"),
		).toBe(true);
		await act(async () => pending.resolve());
	});
	it("does not infer deletion eligibility from playedGames, then explains a server history refusal", async () => {
		const { actions } = mount(undefined, {
			remove: vi
				.fn()
				.mockRejectedValue(
					new Error(
						"Ce joueur a déjà participé à un match. Marquez-le absent pour les prochaines rotations.",
					),
				),
		});
		fireEvent.click(deletion(2));
		await screen.findByText(/Ce joueur possède un historique/);
		expect(actions.remove).toHaveBeenCalledWith(2);
		expect(row(2).queryByRole("button", { name: /Supprimer/ })).toBeNull();
		expect(presence(2).hasAttribute("disabled")).toBe(false);
	});
	it("shows a safe row error for an unknown deletion failure", async () => {
		mount(undefined, {
			remove: vi.fn().mockRejectedValue(new Error("SQL private")),
		});
		fireEvent.click(deletion());
		await screen.findByText(/Suppression non confirmée/);
		expect(document.body.textContent).not.toContain("SQL private");
		expect(
			row(3)
				.getByRole("button", { name: /Supprimer/ })
				.hasAttribute("disabled"),
		).toBe(true);
	});
	it("returns focus to the list when the removed trigger no longer exists", async () => {
		const { control } = mount(undefined, {
			refresh: vi.fn(async () => {
				const data = playersFixture();
				data.players = data.players.filter((p) => p.id !== 3);
				control.update(data);
			}),
		});
		fireEvent.click(deletion());
		await waitFor(() =>
			expect(document.activeElement).toBe(
				screen.getByRole("heading", { name: "Liste des joueurs" }),
			),
		);
	});
});

describe("manual refresh", () => {
	it("preserves the addition draft during refresh and updates only the successful timestamp", async () => {
		const pending = deferred();
		const { control } = mount(undefined, {
			refresh: vi.fn(() => pending.promise),
		});
		fill();
		refresh();
		expect(
			screen
				.getByRole("button", { name: "Actualisation…" })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(screen.getByText("19:00:00")).toBeTruthy();
		await act(async () => {
			const fresh = playersFixture();
			fresh.loadedAt += 60000;
			control.update(fresh);
			pending.resolve();
		});
		expect(screen.getByText("19:01:00")).toBeTruthy();
		expect((screen.getByLabelText("Prénom") as HTMLInputElement).value).toBe(
			"Lou",
		);
	});
	it("preserves timestamp, row errors and add draft on failed refresh", async () => {
		mount(undefined, {
			presence: vi.fn().mockRejectedValue(new Error("lost")),
			refresh: vi.fn().mockRejectedValue(new Error("offline")),
		});
		fill();
		fireEvent.click(presence());
		await screen.findByText(/Présence non confirmée/);
		refresh();
		await screen.findByText(/Actualisation impossible/);
		expect(screen.getByText("19:00:00")).toBeTruthy();
		expect(row().getByRole("alert")).toBeTruthy();
		expect(presence().hasAttribute("disabled")).toBe(true);
		expect((screen.getByLabelText("Prénom") as HTMLInputElement).value).toBe(
			"Lou",
		);
	});
	it("preserves useful validation errors across refreshes", async () => {
		mount();
		fill("A");
		submit();
		refresh();
		await screen.findByText("Liste des joueurs actualisée.");
		expect(screen.getByText(/au moins 2 caractères/)).toBeTruthy();
	});
});

it("keeps a known history protection after a later presence change", async () => {
	const { actions } = mount(undefined, {
		remove: vi
			.fn()
			.mockRejectedValue(
				new Error(
					"Ce joueur a déjà participé à un match. Marquez-le absent pour les prochaines rotations.",
				),
			),
	});
	fireEvent.click(deletion(2));
	await screen.findByText(/Ce joueur possède un historique/);
	fireEvent.click(presence(2));
	await waitFor(() => expect(actions.presence).toHaveBeenCalledTimes(1));
	await screen.findByText(/Présence prise en compte/);
	expect(row(2).queryByRole("button", { name: /Supprimer/ })).toBeNull();
	expect(row(2).getByText(/Ce joueur possède un historique/)).toBeTruthy();
});
it("does not unlock an uncertain addition when manual refresh also fails", async () => {
	mount(undefined, {
		add: vi.fn().mockRejectedValue(new Error("lost response")),
		refresh: vi.fn().mockRejectedValue(new Error("offline")),
	});
	fill();
	submit();
	await screen.findByText(/Ajout non confirmé/);
	refresh();
	await screen.findByText(/Actualisation impossible/);
	expect(
		screen
			.getByRole("button", { name: "Ajouter le joueur" })
			.hasAttribute("disabled"),
	).toBe(true);
	expect((screen.getByLabelText("Prénom") as HTMLInputElement).value).toBe(
		"Lou",
	);
});
