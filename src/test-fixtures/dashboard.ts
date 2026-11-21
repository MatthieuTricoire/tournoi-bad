import type { DashboardData } from "#/components/tournament/types";

export function dashboardFixture(
	state:
		| "preparation"
		| "insufficient"
		| "partial"
		| "complete"
		| "closed"
		| "roundrobin" = "partial",
): DashboardData {
	const players = Array.from({ length: 16 }, (_, index) => ({
		id: index + 1,
		firstname: index === 4 ? "Jean-Baptiste Alexandre" : `Camille ${index + 1}`,
		lastname:
			index === 4
				? "de La Roche-Saint-André"
				: index === 5
					? "NomTrèsLongSansEspacesPourVérifierLeRetourÀLaLigne"
					: "Martin",
		totalScore: 0,
		playedGames: index < 12 ? 1 : 0,
		present: index < 14,
		gender: "M" as const,
	}));
	const matches = Array.from({ length: 3 }, (_, index) => ({
		id: index + 1,
		court: index + 1,
		status: (index === 0 || state === "complete" || state === "closed"
			? "finished"
			: "waiting") as "finished" | "waiting",
		team1: players.slice(index * 4, index * 4 + 2).map((p) => ({
			team: 1,
			teamScore: index === 0 ? 21 : 0,
			playerId: p.id,
			firstname: p.firstname,
			lastname: p.lastname,
		})),
		team2: players.slice(index * 4 + 2, index * 4 + 4).map((p) => ({
			team: 2,
			teamScore: index === 0 ? 18 : 0,
			playerId: p.id,
			firstname: p.firstname,
			lastname: p.lastname,
		})),
	}));
	const preparation = state === "preparation" || state === "insufficient";
	if (state === "insufficient")
		players.forEach((p) => {
			p.present = p.id <= 3;
		});
	return {
		players,
		loadedAt: Date.UTC(2026, 10, 14, 18, 0, 0),
		round: {
			currentRound: preparation ? 0 : 3,
			availableCourts: 4,
			status: state === "closed" ? "finished" : "active",
			roundType: state === "roundrobin" ? "roundrobin" : "infinite",
			maxRounds: 0,
			maximizeParity: true,
			matches: preparation ? [] : matches,
			restingPlayers: preparation ? [] : players.slice(12, 14),
			roundRobinProgress:
				state === "roundrobin"
					? {
							populationSize: 14,
							totalPairs: 91,
							completedPairs: 40,
							remainingPairs: 51,
							progress: 40 / 91,
							minimumRemainingRounds: 9,
							complete: false,
						}
					: null,
		},
		schedule: {
			rounds: [],
			remainingRounds: null,
			partial: state === "roundrobin",
			coverageReached: false,
			simulationLimit: 32,
			message:
				state === "roundrobin"
					? "Estimation partielle : les présences et les compositions peuvent évoluer."
					: "Mode libre : arrêt manuel.",
		},
	};
}
