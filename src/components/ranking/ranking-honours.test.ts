// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import { rankingFixture } from "#/test-fixtures/ranking";
import { RankingHonours } from "./ranking-overview";
import type { RankingEntry } from "./types";

afterEach(cleanup);
function mount(ranks: number[] = [1, 1, 3, 3]) {
	const ranking = rankingFixture()
		.ranking.slice(0, ranks.length)
		.map((player, index) => ({ ...player, ranking: ranks[index] }));
	render(createElement(RankingHonours, { ranking }));
	return within(screen.getByRole("region", { name: "Palmarès" }));
}
it("names first place explicitly without relying on medal colour", () => {
	const honours = mount([1]);
	expect(honours.getByRole("heading", { name: "1re place" })).toBeTruthy();
	expect(honours.queryByText(/ex æquo/)).toBeNull();
	expect(honours.queryByRole("button")).toBeNull();
});
it.each([
	{ ranks: [1, 1, 3], places: [1, 3], counts: [2, 1] },
	{ ranks: [1, 2, 2, 4], places: [1, 2], counts: [1, 2] },
	{ ranks: [1, 1, 1, 4], places: [1], counts: [3] },
])("respects official ranks $ranks with no invented places", ({
	ranks,
	places,
	counts,
}) => {
	const honours = mount(ranks);
	for (const rank of [1, 2, 3]) {
		const section = honours.queryByRole("region", { name: `Rang ${rank}` });
		const index = places.indexOf(rank);
		if (index < 0) expect(section).toBeNull();
		else {
			expect(section).toBeTruthy();
			expect(
				within(section as HTMLElement).getAllByRole("listitem"),
			).toHaveLength(counts[index]);
		}
	}
	expect(honours.getAllByRole("listitem")).toHaveLength(
		counts.reduce((a, b) => a + b, 0),
	);
});
it("displays the three explicit place labels when those ranks exist", () => {
	const honours = mount([1, 2, 3]);
	for (const name of ["1re place", "2e place", "3e place"])
		expect(honours.getByRole("heading", { name })).toBeTruthy();
});
it("shows each supplied average to two decimals and completed match count", () => {
	const ranking: RankingEntry[] = [
		{
			...rankingFixture().ranking[0],
			ranking: 1,
			averageScore: 18.5,
			playedGames: 6,
		},
	];
	render(createElement(RankingHonours, { ranking }));
	const player = within(screen.getByRole("listitem"));
	expect(player.getByText("18,50 pts/match")).toBeTruthy();
	expect(player.getByText("· 6 matchs terminés")).toBeTruthy();
});
it("uses the supplied average without deriving it from total points or rounding ranks", () => {
	const ranking = rankingFixture()
		.ranking.slice(0, 2)
		.map((player, index) => ({
			...player,
			ranking: index + 1,
			averageScore: index === 0 ? 21.004 : 21.003,
		}));
	render(createElement(RankingHonours, { ranking }));
	expect(screen.getAllByText("21,00 pts/match")).toHaveLength(2);
	expect(screen.getByRole("heading", { name: "1re place" })).toBeTruthy();
	expect(screen.getByRole("heading", { name: "2e place" })).toBeTruthy();
});
it("uses the singular for one completed match", () => {
	render(
		createElement(RankingHonours, {
			ranking: [{ ...rankingFixture().ranking[0], playedGames: 1 }],
		}),
	);
	expect(screen.getByText("· 1 match terminé")).toBeTruthy();
});
it("retains complete long names without replacing them with initials", () => {
	const honours = mount();
	expect(
		honours.getByText("Jean-Baptiste Alexandre de La Roche-Saint-André"),
	).toBeTruthy();
	expect(
		honours.getByText(
			"Camille NomTrèsLongSansEspacesPourVérifierLeRetourÀLaLigne",
		),
	).toBeTruthy();
});
it("shows every tied player even when many share first place", () => {
	const ranking = Array.from({ length: 20 }, (_, index) => ({
		...rankingFixture().ranking[0],
		id: 100 + index,
		firstname: `Joueur ${index}`,
		ranking: 1,
	}));
	render(createElement(RankingHonours, { ranking }));
	expect(screen.getAllByRole("listitem")).toHaveLength(20);
	expect(screen.getByText("20 joueurs ex æquo")).toBeTruthy();
	expect(screen.getAllByText("21,00 pts/match")).toHaveLength(20);
});
it("does not derive medal places from array order", () => {
	const ranking = rankingFixture().ranking.slice().reverse();
	render(createElement(RankingHonours, { ranking }));
	expect(
		within(screen.getByRole("region", { name: "Rang 1" })).getByText(
			"Jean-Baptiste Alexandre de La Roche-Saint-André",
		),
	).toBeTruthy();
	expect(
		within(screen.getByRole("region", { name: "Rang 3" })).getByText(
			"Sacha Bernard",
		),
	).toBeTruthy();
});
