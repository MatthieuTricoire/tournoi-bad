import { CheckCircle2, PencilLine } from "lucide-react";
import { Button } from "#/components/ui/button";
import { ScoreForm } from "./score-form";
import type { CourtMatch, ScoreResult, ScoreValues } from "./types";

export function CourtCard({
	match,
	editing,
	disabled,
	saving,
	locked,
	onEdit,
	onCancel,
	onSave,
}: {
	match: CourtMatch;
	editing: boolean;
	disabled: boolean;
	saving: boolean;
	locked: boolean;
	onEdit: () => void;
	onCancel: () => void;
	onSave: (values: ScoreValues) => Promise<ScoreResult>;
}) {
	const finished = match.status === "finished";
	return (
		<article
			aria-labelledby={`court-${match.id}`}
			className="min-w-0 rounded-xl border bg-card text-card-foreground shadow-sm"
		>
			<header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-4 sm:px-5">
				<h3 id={`court-${match.id}`} className="text-xl font-bold">
					Terrain {match.court}
				</h3>
				<span
					className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${finished ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
				>
					{finished && <CheckCircle2 className="size-4" aria-hidden="true" />}
					{finished ? "Terminé" : "En attente de résultat"}
				</span>
			</header>
			<div className="space-y-4 p-4 sm:p-5">
				<div className="divide-y rounded-lg border">
					{[match.team1, match.team2].map((team, index) => (
						<div
							key={index === 0 ? "first" : "second"}
							className="flex min-w-0 items-center gap-3 p-3"
						>
							<div className="min-w-0 flex-1">
								<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Équipe {index + 1}
								</p>
								<ul className="space-y-1 text-base font-semibold leading-snug [overflow-wrap:anywhere]">
									{team.map((player) => (
										<li key={player.playerId}>
											{player.firstname} {player.lastname}
										</li>
									))}
								</ul>
							</div>
							{finished && (
								<p className="min-w-12 shrink-0 text-center text-4xl font-bold tabular-nums text-primary">
									<span className="sr-only">Score équipe {index + 1} : </span>
									{team[0]?.teamScore ?? "—"}
								</p>
							)}
						</div>
					))}
				</div>
				{!finished &&
					(editing ? (
						<ScoreForm
							key={match.id}
							match={match}
							disabled={disabled}
							saving={saving}
							locked={locked}
							onSave={onSave}
							onCancel={onCancel}
						/>
					) : (
						<Button
							type="button"
							variant="outline"
							className="min-h-12 w-full"
							disabled={disabled || locked}
							onClick={onEdit}
						>
							<PencilLine aria-hidden="true" className="size-4" />
							Saisir le score
						</Button>
					))}
				{finished && (
					<p className="text-xs text-muted-foreground">
						Résultat enregistré. Correction depuis le classement.
					</p>
				)}
			</div>
		</article>
	);
}
