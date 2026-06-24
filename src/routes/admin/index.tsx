import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	getCurrentRoundData,
	startNextRound,
	submitMatchScore,
	finishTournament,
	getRoundRobinSchedule,
} from "#/server/functions/tournaments";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";

export const Route = createFileRoute("/admin/")({
	loader: async () => {
		const [roundData, scheduleData] = await Promise.all([
			getCurrentRoundData(),
			getRoundRobinSchedule(),
		]);
		return { roundData, scheduleData };
	},
	component: AdminDashboardComponent,
});

function AdminDashboardComponent() {
	const { roundData, scheduleData } = Route.useLoaderData({});
	const router = useRouter();
	const [showSchedule, setShowSchedule] = useState(false);

	// États pour la saisie des scores (stocke l'ID du match sélectionné et les inputs)
	const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
	const [score1, setScore1] = useState("");
	const [score2, setScore2] = useState("");
	const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });
	const [showConfirmRound, setShowConfirmRound] = useState(false);
	const [showConfirmFinish, setShowConfirmFinish] = useState(false);
	const [isFinishing, setIsFinishing] = useState(false);

	async function handleFinishTournament() {
		setIsFinishing(true);
		try {
			await finishTournament();
			router.invalidate();
		} finally {
			setIsFinishing(false);
		}
	}

	// Lancement de la prochaine rotation
	async function handleNextRound() {
		try {
			await startNextRound();
			router.invalidate();
		} catch (e) {
			setErrorDialog({
				open: true,
				message: e instanceof Error ? e.message : "Une erreur est survenue",
			});
		}
	}

	// Validation du score d'un match
	async function handleSaveScore(e: React.FormEvent) {
		e.preventDefault();
		if (selectedMatchId === null || !score1 || !score2) return;

		await submitMatchScore({
			data: {
				matchId: selectedMatchId,
				scoreTeam1: parseInt(score1),
				scoreTeam2: parseInt(score2),
			},
		});

		// Reset et rechargement de la page
		setSelectedMatchId(null);
		setScore1("");
		setScore2("");
		router.invalidate();
	}

	// Vérifier si tous les matchs du round actuel sont terminés
	const allMatchsFinished =
		roundData.matches.length > 0 &&
		roundData.matches.every((m) => m.status === "finished");

	const isLastRound =
		roundData.status === "finished" ||
		(roundData.roundType === "fixed" &&
			roundData.maxRounds > 0 &&
			roundData.currentRound >= roundData.maxRounds) ||
		(roundData.roundType === "roundrobin" &&
			roundData.roundRobinProgress &&
			roundData.roundRobinProgress.completedPairs >=
				roundData.roundRobinProgress.totalPairs);

	return (
		<div className="container max-w-4xl mx-auto p-4 space-y-6">
			<nav className="flex gap-1 sm:gap-2 overflow-x-auto -mx-4 px-4 pb-1">
				{[
					{ to: "/admin" as const, label: "Tableau de bord" },
					{ to: "/admin/players" as const, label: "Joueurs" },
					{ to: "/admin/settings" as const, label: "Réglages" },
					{ to: "/admin/ranking" as const, label: "Classement" },
				].map((link) => (
					<button
						key={link.to}
						onClick={() => router.navigate({ to: link.to })}
						className="whitespace-nowrap rounded-md text-sm font-medium px-3 py-1.5 border border-input bg-background hover:bg-muted transition-colors"
					>
						{link.label}
					</button>
				))}
			</nav>
			{/* Barre d'outils supérieure */}
			<div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
					<p className="text-muted-foreground">
						Pilote les terrains et enregistre les résultats en direct.
					</p>
				</div>

			</div>
			{/* Rappel des paramètres actifs */}
			<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
				<span className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md border">
					🏸 {roundData.availableCourts} Terrains ouverts
				</span>
				<span
					className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${roundData.maximizeParity ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : "bg-muted"}`}
				>
					{roundData.maximizeParity
						? "👫 Parité : Activée (Double mixte)"
						: "🎲 Parité : Désactivée (Mixte libre)"}
				</span>
				<span className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md border">
					{roundData.roundType === "fixed"
						? `⏱️ Format : ${roundData.maxRounds} Rounds max`
						: roundData.roundType === "roundrobin"
							? "👥 Format : Round-Robin (Tout le monde)"
							: "♾️ Format : Libre (Jusqu'à épuisement)"}
				</span>
				{roundData.roundType === "roundrobin" && roundData.roundRobinProgress && (
					<span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 px-2.5 py-1 rounded-md border">
						📊 {roundData.roundRobinProgress.completedPairs}/{roundData.roundRobinProgress.totalPairs} paires complétées — {scheduleData.rounds.length} rounds restants
					</span>
				)}
				{roundData.roundType === "fixed" && scheduleData.rounds.length > 0 && (
					<span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 px-2.5 py-1 rounded-md border">
						📊 {scheduleData.rounds.length} rounds restants
					</span>
				)}
			</div>{" "}
			{/* État du tournoi */}
			{roundData.currentRound === 0 || roundData.matches.length === 0 ? (
				<div className="rounded-xl border border-dashed p-12 text-center bg-card shadow-sm space-y-4">
					<h2 className="text-xl font-semibold">
						Le tournoi n'a pas encore commencé
					</h2>
					<p className="text-muted-foreground max-w-sm mx-auto">
						Une fois vos joueurs inscrits et marqués comme présents, cliquez sur
						le bouton ci-dessous pour générer le Round 1.
					</p>
					<button
						onClick={() => setShowConfirmRound(true)}
						className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
					>
						🚀 Lancer le Premier Round
					</button>
				</div>
			) : (
				<div className="space-y-6">
					{/* Barre de progression Round-Robin */}
					{roundData.roundType === "roundrobin" && roundData.roundRobinProgress && (
						<div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl space-y-2">
							<div className="flex justify-between text-sm">
								<span className="font-medium text-blue-700 dark:text-blue-400">
									👥 Progression des paires
								</span>
								<span className="text-muted-foreground">
									{roundData.roundRobinProgress.completedPairs}/{roundData.roundRobinProgress.totalPairs} complétées — {scheduleData.rounds.length} rounds restants
								</span>
							</div>
							<div className="w-full bg-muted rounded-full h-3 overflow-hidden">
								<div
									className="bg-blue-500 h-full rounded-full transition-all duration-500"
									style={{ width: `${Math.round(roundData.roundRobinProgress.progress * 100)}%` }}
								/>
							</div>
						</div>
					)}

					{/* En-tête du Round actif */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-primary/5 border border-primary/20 p-4 rounded-xl">
						<span className="text-lg font-bold text-primary">
							🔄 Rotation en cours : Round {roundData.currentRound}
						</span>
						{isLastRound && allMatchsFinished ? (
							<button
								onClick={() => router.navigate({ to: "/admin/ranking" })}
								className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-yellow-500 text-white hover:bg-yellow-400 h-10 px-4 py-2"
							>
								🏆 Voir le classement
							</button>
						) : (
							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => setShowConfirmRound(true)}
									disabled={!allMatchsFinished}
									className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 ${
										allMatchsFinished
											? "bg-green-600 text-white hover:bg-green-500"
											: "bg-muted text-muted-foreground cursor-not-allowed"
									}`}
								>
									{allMatchsFinished
										? "⏭️ Passer au Round Suivant"
										: "⏳ En attente des scores"}
								</button>
								{(roundData.roundType === "infinite" ||
									roundData.roundType === "roundrobin") && (
									<button
										onClick={() => setShowConfirmFinish(true)}
										disabled={!allMatchsFinished}
										className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 ${
											allMatchsFinished
												? "bg-red-600 text-white hover:bg-red-500"
												: "bg-muted text-muted-foreground cursor-not-allowed"
										}`}
									>
										🏁 Terminer le tournoi
									</button>
								)}
							</div>
						)}
					</div>

					{/* Grille des Terrains (Style Cartes shadcn) */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{roundData.matches.map((match) => (
							<div
								key={match.id}
								className={`rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden ${match.status === "finished" ? "opacity-60 bg-muted/20" : ""}`}
							>
								<div className="bg-muted/50 px-4 py-3 border-b flex justify-between items-center">
									<span className="font-bold text-sm tracking-wide uppercase">
										🏸 Terrain {match.court}
									</span>
									<span
										className={`text-xs px-2 py-1 rounded-full font-semibold ${match.status === "finished" ? "bg-zinc-200 text-zinc-700" : "bg-amber-100 text-amber-800 animate-pulse"}`}
									>
										{match.status === "finished" ? "Terminé" : "En cours"}
									</span>
								</div>

								<div className="p-4 space-y-4">
									{/* Affichage des deux paires */}
									<div className="flex justify-between items-center gap-2">
										<div className="space-y-1 w-5/12">
											<p className="text-sm font-semibold truncate capitalize">
												{match.team1[0]?.firstname} {match.team1[0]?.lastname}
											</p>
											<p className="text-sm font-semibold truncate capitalize">
												{match.team1[1]?.firstname} {match.team1[1]?.lastname}
											</p>
										</div>
										<div className="text-center font-bold text-muted-foreground text-xs px-2">
											VS
										</div>
										<div className="space-y-1 w-5/12 text-right">
											<p className="text-sm font-semibold truncate capitalize">
												{match.team2[0]?.firstname} {match.team2[0]?.lastname}
											</p>
											<p className="text-sm font-semibold truncate capitalize">
												{match.team2[1]?.firstname} {match.team2[1]?.lastname}
											</p>
										</div>
									</div>

									{/* Zone de score */}
									{match.status === "finished" ? (
										<div className="bg-muted p-2 rounded-lg text-center font-mono font-bold text-lg text-primary">
											Score final : {match.team1[0]?.teamScore} -{" "}
											{match.team2[0]?.teamScore}
										</div>
									) : selectedMatchId === match.id ? (
										/* Formulaire de saisie dynamique */
										<form
											onSubmit={handleSaveScore}
											className="flex items-center justify-center gap-2 pt-2 border-t"
										>
											<input
												type="number"
												placeholder="T1"
												value={score1}
												onChange={(e) => setScore1(e.target.value)}
												className="w-16 h-9 rounded-md border border-input text-center font-mono"
												required
												min="0"
											/>
											<span className="font-bold">-</span>
											<input
												type="number"
												placeholder="T2"
												value={score2}
												onChange={(e) => setScore2(e.target.value)}
												className="w-16 h-9 rounded-md border border-input text-center font-mono"
												required
												min="0"
											/>
											<button
												type="submit"
												className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium"
											>
												💾 OK
											</button>
											<button
												type="button"
												onClick={() => setSelectedMatchId(null)}
												className="h-9 px-2 rounded-md border border-input text-xs"
											>
												❌
											</button>
										</form>
									) : (
										<button
											onClick={() => setSelectedMatchId(match.id)}
											className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted h-9 text-xs font-semibold"
										>
											📝 Entrer le score
										</button>
									)}
								</div>
							</div>
						))}
					</div>

					{/* Liste d'attente / Buvette */}
					{roundData.restingPlayers.length > 0 && (
						<div className="rounded-xl border bg-card p-4 shadow-sm">
							<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
								🍹 Au repos / À la buvette (Prioritaires au prochain round)
							</h3>
							<div className="flex flex-wrap gap-2">
								{roundData.restingPlayers.map((p) => (
									<span
										key={p.id}
										className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-sm font-medium capitalize text-zinc-800 dark:text-zinc-200 border"
									>
										😴 {p.firstname} {p.lastname}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Planning des rounds à venir */}
					{roundData.roundType !== "infinite" && scheduleData.rounds.length > 0 && (
						<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
							<button
								type="button"
								onClick={() => setShowSchedule(!showSchedule)}
								className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
							>
								<span className="font-semibold text-sm">
									📋 Planning des rounds à venir ({scheduleData.rounds.length} rounds)
									{roundData.roundType === "fixed" && roundData.maxRounds > 0 && (
										<span className="font-normal text-muted-foreground">
											{" "}— Round {roundData.currentRound}/{roundData.maxRounds}
										</span>
									)}
								</span>
								<span className="text-muted-foreground">{showSchedule ? "▲" : "▼"}</span>
							</button>
							{showSchedule && (
								<div className="divide-y">
									{scheduleData.rounds.map((round) => (
										<div key={round.roundNumber} className="p-4 space-y-2">
											<span className="text-sm font-semibold text-primary">
												Round {round.roundNumber} — {round.teams.length} équipes
											</span>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
												{round.teams.map((team, i) => (
													<div
														key={i}
														className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-1.5 rounded-md"
													>
														<span className="text-muted-foreground">👥</span>
														<span className="capitalize font-medium">
															{team.player1.firstname} {team.player1.lastname}
														</span>
														<span className="text-muted-foreground">&</span>
														<span className="capitalize font-medium">
															{team.player2.firstname} {team.player2.lastname}
														</span>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			)}

			<Dialog open={showConfirmRound} onOpenChange={setShowConfirmRound}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Lancer la prochaine rotation ?</DialogTitle>
						<DialogDescription>
							Es-tu sûr de vouloir générer le prochain round&nbsp;?
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setShowConfirmRound(false)}
							className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-muted h-9 px-4 py-2"
						>
							Annuler
						</button>
						<button
							type="button"
							onClick={() => {
								setShowConfirmRound(false);
								handleNextRound();
							}}
							className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
						>
							Confirmer
						</button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={showConfirmFinish} onOpenChange={setShowConfirmFinish}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Terminer le tournoi ?</DialogTitle>
						<DialogDescription>
							Es-tu sûr de vouloir arrêter le tournoi&nbsp;? Les matchs en cours seront conservés et le classement sera figé.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setShowConfirmFinish(false)}
							className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-muted h-9 px-4 py-2"
						>
							Annuler
						</button>
						<button
							type="button"
							disabled={isFinishing}
							onClick={() => {
								setShowConfirmFinish(false);
								handleFinishTournament();
							}}
							className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-500 h-9 px-4 py-2 disabled:opacity-50"
						>
							{isFinishing ? "Arrêt..." : "Oui, terminer"}
						</button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={errorDialog.open}
				onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Erreur</DialogTitle>
						<DialogDescription>{errorDialog.message}</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</div>
	);
}
