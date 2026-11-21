import { useRef } from "react";
import { Button } from "#/components/ui/button";
import type { HistoryMatch, RankingData } from "./types";

export function MatchHistory({
	history,
	disabled,
	onEdit,
}: {
	history: RankingData["history"];
	disabled: boolean;
	onEdit: (
		match: HistoryMatch,
		round: number,
		trigger: HTMLButtonElement,
	) => void;
}) {
	const heading = useRef<HTMLHeadingElement>(null);
	const rounds = [...history].sort((a, b) => b.round - a.round);
	return (
		<section aria-labelledby="match-history-title" className="space-y-3">
			<h2
				ref={heading}
				tabIndex={-1}
				id="match-history-title"
				className="text-xl font-bold focus-visible:outline-2 focus-visible:outline-ring"
			>
				Historique des matchs
			</h2>
			{!rounds.length && (
				<p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
					Aucun match généré pour le moment.
				</p>
			)}
			{rounds.map((round) => (
				<details
					key={round.round}
					open={round.round === rounds[0]?.round}
					className="rounded-xl border bg-card shadow-sm"
				>
					<summary className="min-h-12 cursor-pointer rounded-xl p-4 font-bold focus-visible:outline-2 focus-visible:outline-ring">
						Rotation {round.round}
						<span className="ml-2 text-sm font-medium text-muted-foreground">
							· {round.matches.length} match
							{round.matches.length !== 1 ? "s" : ""}
						</span>
					</summary>
					<div className="grid items-start gap-3 border-t p-3 md:grid-cols-2 sm:p-4">
						{round.matches.map((match) => (
							<article
								key={match.id}
								aria-label={`Rotation ${round.round}, terrain ${match.court}`}
								className="min-w-0 rounded-lg border p-3 sm:p-4"
							>
								<header className="mb-3 flex flex-wrap items-center justify-between gap-2">
									<h3 className="font-bold">Terrain {match.court}</h3>
									<span
										className={`rounded-full px-2 py-1 text-xs font-semibold ${match.status === "finished" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
									>
										{match.status === "finished"
											? "Terminé"
											: "En attente de résultat"}
									</span>
								</header>
								<div className="divide-y rounded-lg border">
									{[match.team1, match.team2].map((team, index) => (
										<div
											key={index === 0 ? "team1" : "team2"}
											className="flex items-center gap-3 p-3"
										>
											<div className="min-w-0 flex-1">
												<p className="mb-1 text-xs font-medium text-muted-foreground">
													Équipe {index + 1}
												</p>
												<ul className="space-y-1 text-sm font-semibold [overflow-wrap:anywhere]">
													{team.map((p) => (
														<li key={p.playerId}>
															{p.firstname} {p.lastname}
														</li>
													))}
												</ul>
											</div>
											{match.status === "finished" && (
												<p className="shrink-0 text-3xl font-bold tabular-nums text-primary">
													<span className="sr-only">
														Score équipe {index + 1} :{" "}
													</span>
													{team[0]?.teamScore ?? "?"}
												</p>
											)}
										</div>
									))}
								</div>
								{match.status === "finished" ? (
									<Button
										type="button"
										variant="outline"
										disabled={disabled}
										aria-label={`Modifier le score — rotation ${round.round}, terrain ${match.court}`}
										className="mt-3 min-h-11 w-full scroll-mb-24 whitespace-normal"
										onClick={(event) =>
											onEdit(match, round.round, event.currentTarget)
										}
									>
										Modifier le score
										<span className="sr-only">
											{" "}
											— rotation {round.round}, terrain {match.court}
										</span>
									</Button>
								) : (
									<p className="mt-3 text-xs text-muted-foreground">
										Le résultat sera saisi depuis le tableau de bord.
									</p>
								)}
							</article>
						))}
					</div>
				</details>
			))}
		</section>
	);
}
