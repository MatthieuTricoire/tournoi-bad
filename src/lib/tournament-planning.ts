import {
	generateRound,
	getRoundRobinProgress,
	type MatchHistoryInput,
	type PlayerInput,
} from "./utils";

export const MAX_SIMULATED_ROUNDS = 32;
// Deterministic workload budget: shorter previews for large selected fields.
const SIMULATION_WORK_BUDGET = 8192;
export const PARTIAL_ESTIMATE_MESSAGE =
	"Estimation partielle : le nombre exact de rotations dépendra des prochaines compositions et des présences. Vous pouvez continuer les rotations ou terminer manuellement après la saisie des scores.";

type PlanningInput = {
	players: PlayerInput[];
	history: MatchHistoryInput[];
	availableCourts: number;
	currentRound: number;
	roundType: "infinite" | "fixed" | "roundrobin";
	maxRounds: number;
	maximizeParity: boolean;
	status: "active" | "finished";
};

// Pure forecast: no reservation, database access or mutation of caller inputs.
export function simulateSchedule(input: PlanningInput) {
	const selectedCount =
		Math.min(
			Math.floor(input.availableCourts),
			Math.floor(input.players.filter((p) => p.present !== false).length / 4),
		) * 4;
	const simulationLimit = Math.min(
		MAX_SIMULATED_ROUNDS,
		Math.max(
			1,
			Math.floor(SIMULATION_WORK_BUDGET / Math.max(1, selectedCount ** 2)),
		),
	);
	const rounds: Array<{
		roundNumber: number;
		remainingPairs: number;
		matches: ReturnType<typeof generateRound>["matches"];
		teams: Array<{ player1: PlayerInput; player2: PlayerInput }>;
	}> = [];
	const remainingRounds =
		input.roundType === "fixed"
			? Math.max(0, input.maxRounds - input.currentRound)
			: null;
	const result = {
		rounds,
		remainingRounds,
		partial: false,
		coverageReached: false,
		simulationLimit,
		message:
			"Planning indicatif, recalculé selon les présences et les réglages. Les matchs en attente sont supposés terminés avant la prochaine rotation.",
	};
	if (input.status === "finished")
		return { ...result, message: "Le tournoi est terminé." };
	if (input.roundType === "infinite")
		return {
			...result,
			message: "Mode libre : aucune fin prédéterminée, arrêt manuel.",
		};
	const players = input.players
		.filter((p) => p.present !== false)
		.map((p) => ({ ...p }));
	if (players.length < 4)
		return {
			...result,
			partial: true,
			message:
				"Au moins quatre joueurs présents sont nécessaires. Ajustez les présences ou terminez manuellement le tournoi.",
		};
	// Forecast assumes pending matches will finish. Actual progress never does.
	const history = input.history.map((row) => ({
		...row,
		status: "finished" as const,
	}));
	const byId = new Map(players.map((p) => [p.id, p]));
	let simulatedMatchId =
		history.reduce((min, row) => Math.min(min, row.matchId), 0) - 1;
	let progress = getRoundRobinProgress(players, history, input.availableCourts);
	for (let i = 0; i < simulationLimit; i++) {
		if (input.roundType === "fixed" && i >= (remainingRounds ?? 0)) break;
		if (input.roundType === "roundrobin" && progress.complete) break;
		const roundNumber = input.currentRound + i + 1;
		const generated = generateRound(
			players,
			history,
			input.availableCourts,
			roundNumber,
			input.maximizeParity,
		);
		const teams: Array<{ player1: PlayerInput; player2: PlayerInput }> = [];
		for (const match of generated.matches) {
			for (const [index, ids] of [match.team1Ids, match.team2Ids].entries()) {
				const first = byId.get(ids[0]),
					second = byId.get(ids[1]);
				if (!first || !second) throw new Error("Joueur absent du planning.");
				teams.push({ player1: { ...first }, player2: { ...second } });
				for (const playerId of ids) {
					history.push({
						matchId: simulatedMatchId,
						playerId,
						team: index + 1,
						roundNumber,
						status: "finished",
					});
					const player = byId.get(playerId);
					if (player) player.playedGames++;
				}
			}
			simulatedMatchId--;
		}
		progress = getRoundRobinProgress(players, history, input.availableCourts);
		rounds.push({
			roundNumber,
			remainingPairs: progress.remainingPairs,
			matches: generated.matches,
			teams,
		});
	}
	const coverageReached = input.roundType === "roundrobin" && progress.complete;
	const partial =
		input.roundType === "fixed"
			? rounds.length < (remainingRounds ?? 0)
			: !coverageReached;
	return {
		...result,
		partial,
		coverageReached,
		message: partial
			? input.roundType === "fixed"
				? `Aperçu limité aux ${simulationLimit} prochaines rotations sur ${remainingRounds} restantes. Les compositions dépendent des présences et des réglages.`
				: PARTIAL_ESTIMATE_MESSAGE
			: result.message,
	};
}
