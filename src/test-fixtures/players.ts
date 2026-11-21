import type { PlayersData } from "#/components/players/types";

export function playersFixture(): PlayersData {
	return {
		loadedAt: Date.UTC(2026, 10, 14, 18),
		players: [
			{
				id: 1,
				firstname: "Jean-Baptiste Alexandre",
				lastname: "de La Roche-Saint-André",
				present: true,
				playedGames: 3,
				totalScore: 42,
				gender: "M",
			},
			{
				id: 2,
				firstname: "Camille",
				lastname: "NomTrèsLongSansEspacesPourVérifierLeRetourÀLaLigne",
				present: false,
				playedGames: 0,
				totalScore: 0,
				gender: "F",
			},
			{
				id: 3,
				firstname: "Alex",
				lastname: "Martin",
				present: true,
				playedGames: 0,
				totalScore: 0,
				gender: "M",
			},
		],
	};
}
