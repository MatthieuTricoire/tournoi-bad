import type { DashboardData } from "./types";

export function TournamentPlanning({ data }: { data: DashboardData }) {
	const { round, schedule } = data;
	if (round.roundType === "infinite" || round.status === "finished")
		return null;
	return (
		<details className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
			<summary className="min-h-11 cursor-pointer content-center font-semibold focus-visible:outline-2 focus-visible:outline-ring">
				Planning prévisionnel · {schedule.rounds.length} rotation
				{schedule.rounds.length !== 1 ? "s" : ""} simulée
				{schedule.rounds.length !== 1 ? "s" : ""}
			</summary>
			<div className="mt-3 space-y-4">
				{schedule.partial ? (
					<p className="rounded-lg bg-muted p-3 text-sm">
						{round.roundType === "fixed"
							? `Aperçu partiel : ${schedule.rounds.length} rotations simulées sur ${schedule.remainingRounds ?? 0} restantes. Les compositions peuvent évoluer selon les présences.`
							: `Prévision partielle : ${schedule.rounds.length} rotations simulées. Les compositions peuvent évoluer selon les présences. La couverture complète n'est pas garantie.`}
					</p>
				) : (
					<p className="text-sm text-muted-foreground">
						Simulation indicative, recalculée selon les présences et les
						réglages. Les matchs en attente sont supposés terminés avant la
						prochaine rotation.
					</p>
				)}
				{round.roundType === "fixed" && (
					<p className="text-sm">
						Rotations restantes dans le format fixe :{" "}
						{schedule.remainingRounds ?? 0}.
					</p>
				)}
				{schedule.rounds.length === 0 && (
					<p className="text-sm text-muted-foreground">{schedule.message}</p>
				)}
				{schedule.rounds.map((future) => (
					<section key={future.roundNumber} className="border-t pt-3">
						<h3 className="mb-2 text-sm font-bold">
							Rotation {future.roundNumber} ·{" "}
							{future.matches?.length ?? future.teams.length / 2} matchs
						</h3>
						<ul className="grid gap-2 text-sm sm:grid-cols-2">
							{future.teams.map((team) => (
								<li
									key={`${team.player1.id}-${team.player2.id}`}
									className="rounded-lg bg-muted/50 p-3 [overflow-wrap:anywhere]"
								>
									{team.player1.firstname} {team.player1.lastname}{" "}
									<span className="text-muted-foreground">et</span>{" "}
									{team.player2.firstname} {team.player2.lastname}
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</details>
	);
}

export function TournamentDetails({ data }: { data: DashboardData }) {
	const { round } = data;
	return (
		<>
			{round.restingPlayers.length > 0 && (
				<section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
					<h2 className="font-bold">
						Au repos · {round.restingPlayers.length} joueur
						{round.restingPlayers.length !== 1 ? "s" : ""}
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Joueurs présents sans match dans cette rotation.
					</p>
					<ul className="mt-3 flex flex-wrap gap-2">
						{round.restingPlayers.map((player) => (
							<li
								key={player.id}
								className="max-w-full rounded-lg bg-muted px-3 py-2 text-sm font-medium [overflow-wrap:anywhere]"
							>
								{player.firstname} {player.lastname}
							</li>
						))}
					</ul>
				</section>
			)}
			{round.roundRobinProgress && (
				<section className="space-y-2 rounded-xl border bg-card p-4 sm:p-5">
					<h2 className="font-bold">Partenariats des joueurs présents</h2>
					<p className="text-sm">
						{round.roundRobinProgress.completedPairs} sur{" "}
						{round.roundRobinProgress.totalPairs} paires jouées parmi{" "}
						{round.roundRobinProgress.populationSize} joueurs présents.
					</p>
					{round.roundRobinProgress.totalPairs > 0 && (
						<progress
							aria-label="Couverture des partenariats"
							max={round.roundRobinProgress.totalPairs}
							value={round.roundRobinProgress.completedPairs}
							className="h-2.5 w-full appearance-none overflow-hidden rounded-full border-0 [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
						/>
					)}
					<p className="text-xs text-muted-foreground">
						Seuls les matchs terminés comptent. Cette progression dépend des
						présences ; la couverture complète n'est pas garantie.
					</p>
				</section>
			)}
			<TournamentPlanning data={data} />
		</>
	);
}
