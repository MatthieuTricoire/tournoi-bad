import type { HistoryMatch, RankingData } from "#/components/ranking/types";
import { dashboardFixture } from "./dashboard";

export function rankingFixture(
	state: "active" | "closed" | "empty" | "waiting" = "active",
): RankingData {
	const people = [
		{
			id: 1,
			firstname: "Jean-Baptiste Alexandre",
			lastname: "de La Roche-Saint-André",
		},
		{
			id: 2,
			firstname: "Camille",
			lastname: "NomTrèsLongSansEspacesPourVérifierLeRetourÀLaLigne",
		},
		{ id: 3, firstname: "Alex", lastname: "Martin" },
		{ id: 4, firstname: "Sacha", lastname: "Bernard" },
	];
	const team = (ids: number[], score: number) =>
		ids.map((id) => ({ playerId: id, ...people[id - 1], teamScore: score }));
	const finished: HistoryMatch = {
		id: 21,
		court: 1,
		status: "finished",
		team1: team([1, 2], 21),
		team2: team([3, 4], 20),
	};
	const waiting: HistoryMatch = {
		id: 22,
		court: 2,
		status: "waiting",
		team1: [
			{ playerId: 5, firstname: "Lou", lastname: "Durand", teamScore: 0 },
			{ playerId: 6, firstname: "Sam", lastname: "Petit", teamScore: 0 },
		],
		team2: [
			{ playerId: 7, firstname: "Robin", lastname: "Moreau", teamScore: 0 },
			{ playerId: 8, firstname: "Charlie", lastname: "Dubois", teamScore: 0 },
		],
	};
	const data: RankingData = {
		loadedAt: Date.UTC(2026, 10, 14, 18),
		round: {
			...dashboardFixture("preparation").round,
			currentRound: 2,
			status: state === "closed" ? "finished" : "active",
			restingPlayers: [],
		},
		ranking: people.map((p, index) => ({
			...p,
			ranking: index < 2 ? 1 : 3,
			playedGames: 2,
			totalScore: index < 2 ? 42 : 40,
			averageScore: index < 2 ? 21 : 20,
			wins: index < 2 ? 2 : 0,
			losses: index < 2 ? 0 : 2,
		})),
		history: [
			{ round: 1, matches: [{ ...finished, id: 11 }] },
			{
				round: 2,
				matches: state === "closed" ? [finished] : [finished, waiting],
			},
		],
	};
	if (state === "empty" || state === "waiting") {
		data.ranking = [];
		data.history =
			state === "waiting" ? [{ round: 1, matches: [waiting] }] : [];
		data.round.currentRound = state === "empty" ? 0 : 1;
	}
	return data;
}
