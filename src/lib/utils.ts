import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type PlayerInput = {
	id: number;
	firstname: string;
	lastname: string;
	gender: string | null;
	playedGames: number;
};

type MatchHistoryInput = {
	matchId: number;
	playerId: number;
	team: number;
};

export function buildPartnershipMatrix(
	history: MatchHistoryInput[],
): Map<string, number> {
	const matrix = new Map<string, number>();
	const matchesMap = new Map<number, MatchHistoryInput[]>();

	for (const row of history) {
		if (!matchesMap.has(row.matchId)) matchesMap.set(row.matchId, []);
		matchesMap.get(row.matchId)!.push(row);
	}

	for (const [, participants] of matchesMap) {
		const team1 = participants.filter((p) => p.team === 1);
		const team2 = participants.filter((p) => p.team === 2);

		for (const team of [team1, team2]) {
			if (team.length === 2) {
				const key = `${Math.min(team[0].playerId, team[1].playerId)},${Math.max(team[0].playerId, team[1].playerId)}`;
				matrix.set(key, (matrix.get(key) || 0) + 1);
			}
		}
	}

	return matrix;
}

export function getCompletedPairsSet(
	history: MatchHistoryInput[],
): Set<string> {
	const completed = new Set<string>();
	const matchesMap = new Map<number, MatchHistoryInput[]>();

	for (const row of history) {
		if (!matchesMap.has(row.matchId)) matchesMap.set(row.matchId, []);
		matchesMap.get(row.matchId)!.push(row);
	}

	for (const [, participants] of matchesMap) {
		const team1 = participants.filter((p) => p.team === 1);
		const team2 = participants.filter((p) => p.team === 2);

		if (team1.length === 2) {
			completed.add(
				`${Math.min(team1[0].playerId, team1[1].playerId)},${Math.max(team1[0].playerId, team1[1].playerId)}`,
			);
		}
		if (team2.length === 2) {
			completed.add(
				`${Math.min(team2[0].playerId, team2[1].playerId)},${Math.max(team2[0].playerId, team2[1].playerId)}`,
			);
		}
	}

	return completed;
}

export function generateRoundRobinRound(
	allPlayers: PlayerInput[],
	history: MatchHistoryInput[],
	maxCourts: number,
	nextRoundNumber: number,
) {
	const sortedPlayers = [...allPlayers].sort(
		(a, b) => a.playedGames - b.playedGames,
	);

	const maxSlots = maxCourts * 4;
	const totalPlayers = sortedPlayers.length;

	let playersToPlay: number;
	if (totalPlayers <= maxSlots) {
		playersToPlay = totalPlayers % 2 === 0 ? totalPlayers : totalPlayers - 1;
	} else {
		playersToPlay = maxSlots % 2 === 0 ? maxSlots : maxSlots - 1;
	}

	if (playersToPlay < 4) {
		throw new Error(
			"Il n'y a pas assez de joueurs présents pour remplir au moins 1 terrain !",
		);
	}

	const selectedPlayers = sortedPlayers.slice(0, playersToPlay);
	const restingPlayers = sortedPlayers.slice(playersToPlay);

	const partnershipMatrix = buildPartnershipMatrix(history);

	const getCount = (p1Id: number, p2Id: number) =>
		partnershipMatrix.get(
			`${Math.min(p1Id, p2Id)},${Math.max(p1Id, p2Id)}`,
		) || 0;

	const pool = [...selectedPlayers];
	const teams: PlayerInput[][] = [];

	while (pool.length >= 2) {
		const playerA = pool.shift()!;
		let bestPartnerIndex = 0;
		let minPartnerships = Infinity;

		for (let i = 0; i < pool.length; i++) {
			const count = getCount(playerA.id, pool[i].id);
			if (count < minPartnerships) {
				minPartnerships = count;
				bestPartnerIndex = i;
			}
		}

		const playerB = pool.splice(bestPartnerIndex, 1)[0];
		teams.push([playerA, playerB]);
	}

	const generatedMatches = [];
	let courtNumber = 1;

	while (teams.length >= 2) {
		const team1 = teams.shift()!;
		const team2 = teams.shift()!;

		generatedMatches.push({
			roundNumber: nextRoundNumber,
			court: courtNumber,
			team1Ids: team1.map((p) => p.id),
			team2Ids: team2.map((p) => p.id),
		});

		courtNumber++;
	}

	return {
		matches: generatedMatches,
		restingPlayerIds: restingPlayers.map((p) => p.id),
	};
}

export function getRoundRobinProgress(
	allPlayers: PlayerInput[],
	history: MatchHistoryInput[],
	maxCourts: number,
) {
	const completedPairs = getCompletedPairsSet(history);
	const totalPlayers = allPlayers.length;
	const totalPairs = (totalPlayers * (totalPlayers - 1)) / 2;
	const completed = completedPairs.size;

	const maxSlots = maxCourts * 4;
	const effectivePlayers =
		totalPlayers <= maxSlots ? totalPlayers : maxSlots;
	const maxPairsPerRound = Math.floor(effectivePlayers / 2);

	const remainingPairs = totalPairs - completed;
	const estimatedRounds =
		maxPairsPerRound > 0
			? Math.ceil(remainingPairs / maxPairsPerRound)
			: 0;

	return {
		totalPairs,
		completedPairs: completed,
		remainingPairs: Math.max(0, remainingPairs),
		estimatedRounds: Math.max(0, estimatedRounds),
		progress: totalPairs > 0 ? completed / totalPairs : 0,
	};
}

export function generateRound(
	allPlayers: PlayerInput[],
	history: MatchHistoryInput[],
	maxCourts: number,
	nextRoundNumber: number,
	maximizeParity: boolean,
) {
	// ÉTAPE 1 : File d'attente classique pour l'équité
	const sortedPlayers = [...allPlayers].sort(
		(a, b) => a.playedGames - b.playedGames,
	);

	const maxPlayersOnCourts = maxCourts * 4;
	const maxMultipleOfFour = Math.floor(sortedPlayers.length / 4) * 4;
	const playersToSelect = Math.min(maxPlayersOnCourts, maxMultipleOfFour);

	if (playersToSelect < 4) {
		throw new Error(
			"Il n'y a pas assez de joueurs présents pour remplir au moins 1 terrain !",
		);
	}

	const selectedPlayers = sortedPlayers.slice(0, playersToSelect);
	const restingPlayers = sortedPlayers.slice(playersToSelect);

	// ÉTAPE 2 : Fonction historique pour compter les partenariats
	const getPartnershipCount = (p1Id: number, p2Id: number): number => {
		let count = 0;
		const matchesMap = new Map<number, MatchHistoryInput[]>();
		for (const row of history) {
			if (!matchesMap.has(row.matchId)) matchesMap.set(row.matchId, []);
			matchesMap.get(row.matchId)!.push(row);
		}
		for (const [_, participants] of matchesMap) {
			const p1 = participants.find((p) => p.playerId === p1Id);
			const p2 = participants.find((p) => p.playerId === p2Id);
			if (p1 && p2 && p1.team === p2.team) {
				count++;
			}
		}
		return count;
	};

	const teams: PlayerInput[][] = [];

	// ÉTAPE 3 : Création des paires (équipes)
	if (maximizeParity) {
		// --- LOGIQUE PARITÉ ACTIVE (Double mixte privilégié) ---
		// On sépare notre groupe de sélectionnés en deux paniers : Hommes et Femmes
		const men = selectedPlayers.filter((p) => p.gender === "M");
		const women = selectedPlayers.filter((p) => p.gender === "F");

		// Tant qu'on a au moins un homme et une femme disponibles, on les marie ensemble !
		while (men.length > 0 && women.length > 0) {
			const playerA = men.shift()!; // On prend le premier homme
			let bestPartnerIndex = 0;
			let minGamesTogether = Infinity;

			// On cherche parmi les femmes celle avec qui il a le moins joué
			for (let i = 0; i < women.length; i++) {
				const gamesTogether = getPartnershipCount(playerA.id, women[i].id);
				if (gamesTogether < minGamesTogether) {
					minGamesTogether = gamesTogether;
					bestPartnerIndex = i;
				}
			}

			const playerB = women.splice(bestPartnerIndex, 1)[0];
			teams.push([playerA, playerB]);
		}

		// S'il reste des joueurs du même sexe (ex: 12 hommes et 4 femmes sélectionnés),
		// on apparie le reste des joueurs ensemble de manière classique
		const remainingPool = [...men, ...women];
		while (remainingPool.length > 0) {
			const playerA = remainingPool.shift()!;
			let bestPartnerIndex = 0;
			let minGamesTogether = Infinity;

			for (let i = 0; i < remainingPool.length; i++) {
				const gamesTogether = getPartnershipCount(
					playerA.id,
					remainingPool[i].id,
				);
				if (gamesTogether < minGamesTogether) {
					minGamesTogether = gamesTogether;
					bestPartnerIndex = i;
				}
			}

			const playerB = remainingPool.splice(bestPartnerIndex, 1)[0];
			teams.push([playerA, playerB]);
		}
	} else {
		// --- LOGIQUE STANDARD (Pas de contrainte de genre) ---
		const pool = [...selectedPlayers];
		while (pool.length > 0) {
			const playerA = pool.shift()!;
			let bestPartnerIndex = 0;
			let minGamesTogether = Infinity;

			for (let i = 0; i < pool.length; i++) {
				const gamesTogether = getPartnershipCount(playerA.id, pool[i].id);
				if (gamesTogether < minGamesTogether) {
					minGamesTogether = gamesTogether;
					bestPartnerIndex = i;
				}
			}

			const playerB = pool.splice(bestPartnerIndex, 1)[0];
			teams.push([playerA, playerB]);
		}
	}

	// ÉTAPE 4 : Associer les paires deux par deux sur les terrains
	const generatedMatches = [];
	let courtNumber = 1;

	while (teams.length >= 2) {
		const team1 = teams.shift()!;
		const team2 = teams.shift()!;

		generatedMatches.push({
			roundNumber: nextRoundNumber,
			court: courtNumber,
			team1Ids: team1.map((p) => p.id),
			team2Ids: team2.map((p) => p.id),
		});

		courtNumber++;
	}

	return {
		matches: generatedMatches,
		restingPlayerIds: restingPlayers.map((p) => p.id),
	};
}
