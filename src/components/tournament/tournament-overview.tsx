import { Link } from "@tanstack/react-router";
import {
	Flag,
	LoaderCircle,
	Play,
	Settings,
	Trophy,
	Users,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import type { DashboardData } from "./types";

export function TournamentOverview({
	data,
	busy,
	mustRefresh,
	generating,
	onGenerate,
	onFinish,
}: {
	data: DashboardData;
	busy: boolean;
	mustRefresh: boolean;
	generating: boolean;
	onGenerate: () => void;
	onFinish: () => void;
}) {
	const { round } = data;
	const present = data.players.filter((p) => p.present).length;
	const pending = round.matches.filter((m) => m.status !== "finished");
	const completed = round.matches.length - pending.length;
	const allFinished = pending.length === 0;
	const closed = round.status === "finished";
	const firstRound = round.currentRound === 0;
	const limitReached =
		(round.roundType === "fixed" &&
			round.maxRounds > 0 &&
			round.currentRound >= round.maxRounds) ||
		Boolean(
			round.roundType === "roundrobin" && round.roundRobinProgress?.complete,
		);
	const pendingCourts = pending.map((m) => m.court).join(", ");
	const format =
		round.roundType === "fixed"
			? `${round.maxRounds} rotations`
			: round.roundType === "roundrobin"
				? "Couverture des partenaires"
				: "Libre · arrêt manuel";
	const generateBlocked =
		busy ||
		mustRefresh ||
		closed ||
		present < 4 ||
		(!firstRound && !allFinished) ||
		limitReached;
	return (
		<>
			{" "}
			<section
				aria-label="Configuration actuelle"
				className="grid gap-3 sm:grid-cols-3"
			>
				{[
					{ label: "Joueurs présents", value: `${present}`, icon: Users },
					{
						label: "Terrains configurés",
						value: `${round.availableCourts}`,
						icon: Flag,
					},
					{ label: "Format", value: format, icon: Trophy },
				].map(({ label, value, icon: Icon }) => (
					<div
						key={label}
						className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm"
					>
						<Icon
							aria-hidden="true"
							className="mt-1 size-5 shrink-0 text-primary"
						/>
						<div className="min-w-0">
							<p className="text-xs font-medium text-muted-foreground">
								{label}
							</p>
							<p className="mt-1 font-bold [overflow-wrap:anywhere]">{value}</p>
						</div>
					</div>
				))}
			</section>
			{!closed && (
				<p className="text-sm text-muted-foreground">
					Doubles mixtes :{" "}
					{round.maximizeParity
						? "préférence activée, après la diversité des partenaires et adversaires."
						: "pas de préférence."}
				</p>
			)}
			{closed ? (
				<section className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6">
					<h2 className="text-2xl font-bold">Tournoi clôturé</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						Consultez le classement final et l'historique. Les scores terminés
						peuvent être corrigés sans rouvrir le tournoi.
					</p>
					<Button asChild className="mt-4 min-h-11">
						<Link to="/classement">
							<Trophy aria-hidden="true" className="size-4" />
							Voir le classement
						</Link>
					</Button>
				</section>
			) : firstRound ? (
				<section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
					<h2 className="text-2xl font-bold">
						Prêt pour la première rotation ?
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						Vérifiez les présences et les réglages. Le moteur attribuera les
						matchs selon les joueurs et les terrains disponibles.
					</p>
					<div className="mt-4 flex flex-wrap gap-2">
						<Button asChild variant="outline" className="min-h-11">
							<Link to="/joueurs">
								<Users aria-hidden="true" className="size-4" />
								Gérer les joueurs
							</Link>
						</Button>
						<Button asChild variant="outline" className="min-h-11">
							<Link to="/reglages">
								<Settings aria-hidden="true" className="size-4" />
								Modifier les réglages
							</Link>
						</Button>
					</div>
					{present < 4 && (
						<p className="mt-4 text-sm font-medium">
							Il faut au moins quatre joueurs présents pour lancer une rotation.
						</p>
					)}
					<Button
						type="button"
						onClick={() => onGenerate()}
						disabled={generateBlocked}
						className="mt-5 min-h-12 w-full whitespace-normal sm:w-auto"
					>
						{generating ? (
							<LoaderCircle
								aria-hidden="true"
								className="size-4 motion-safe:animate-spin"
							/>
						) : (
							<Play aria-hidden="true" className="size-4" />
						)}
						{generating ? "Génération…" : "Lancer la première rotation"}
					</Button>
				</section>
			) : (
				<section
					aria-label={`Résumé de la rotation ${round.currentRound}`}
					className="space-y-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6"
				>
					<div>
						<h2 className="text-2xl font-bold">
							Rotation {round.currentRound}
						</h2>
						<p className="mt-1 font-medium">
							{completed} match{completed !== 1 ? "s" : ""} terminé
							{completed !== 1 ? "s" : ""} sur {round.matches.length}
						</p>
					</div>
					{round.matches.length > 0 && (
						<progress
							aria-label={`Résultats de la rotation ${round.currentRound}`}
							aria-valuetext={`${completed} matchs terminés sur ${round.matches.length}`}
							max={round.matches.length}
							value={completed}
							className="h-2.5 w-full appearance-none overflow-hidden rounded-full border-0 [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
						/>
					)}
					<p className="text-sm text-muted-foreground">
						{pending.length > 0
							? `Il reste les résultats des terrains ${pendingCourts}. Terminez ces scores avant de générer la prochaine rotation.`
							: round.matches.length === 0
								? "Aucun match dans cette rotation. Vérifiez les présences et les réglages avant de poursuivre."
								: "Tous les résultats de cette rotation sont enregistrés."}
					</p>
					{present < 4 && (
						<p className="text-sm">
							Il faut au moins quatre joueurs présents pour générer une nouvelle
							rotation.
						</p>
					)}
					<div className="flex flex-wrap gap-2">
						{!limitReached && (
							<Button
								type="button"
								disabled={generateBlocked}
								onClick={() => onGenerate()}
								className="min-h-11"
							>
								{generating && (
									<LoaderCircle
										aria-hidden="true"
										className="size-4 motion-safe:animate-spin"
									/>
								)}
								{generating ? "Génération…" : "Générer la rotation suivante"}
							</Button>
						)}
						<Button asChild variant="outline" className="min-h-11">
							<Link to="/classement">Voir le classement</Link>
						</Button>
						{(round.roundType === "infinite" ||
							round.roundType === "roundrobin") && (
							<Button
								type="button"
								variant="outline"
								className="min-h-11"
								disabled={!allFinished || busy || mustRefresh}
								onClick={() => onFinish()}
							>
								Terminer le tournoi
							</Button>
						)}
					</div>
				</section>
			)}
		</>
	);
}
