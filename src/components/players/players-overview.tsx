import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import type { PlayersData } from "./types";

export function PlayersHeader({
	data,
	busy,
	refreshing,
	onRefresh,
}: {
	data: PlayersData;
	busy: boolean;
	refreshing: boolean;
	onRefresh: () => void;
}) {
	return (
		<header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
			<div>
				<p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">
					Organisation du tournoi
				</p>
				<h1 className="text-3xl font-bold tracking-tight">Joueurs</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Inscrivez les participants et ajustez les présences pour les
					prochaines rotations.
				</p>
			</div>
			<div className="shrink-0 space-y-1 sm:text-right">
				<Button
					type="button"
					variant="outline"
					disabled={busy}
					onClick={onRefresh}
					className="min-h-11"
				>
					<RefreshCw
						aria-hidden="true"
						className={`size-4 ${refreshing ? "motion-safe:animate-spin" : ""}`}
					/>
					{refreshing ? "Actualisation…" : "Actualiser"}
				</Button>
				<p className="text-xs text-muted-foreground">
					Actualisé à{" "}
					<time dateTime={new Date(data.loadedAt).toISOString()}>
						{new Intl.DateTimeFormat("fr-FR", {
							hour: "2-digit",
							minute: "2-digit",
							second: "2-digit",
							timeZone: "Europe/Paris",
						}).format(data.loadedAt)}
					</time>
				</p>
			</div>
		</header>
	);
}

export function PlayersCounts({ data }: { data: PlayersData }) {
	const present = data.players.filter((p) => p.present).length;
	return (
		<dl
			aria-label="Résumé des inscriptions"
			className="grid grid-cols-3 gap-2 sm:gap-3"
		>
			{[
				["Inscrits", data.players.length],
				["Présents", present],
				["Absents", data.players.length - present],
			].map(([label, count]) => (
				<div
					key={label}
					className="rounded-xl border bg-card p-3 shadow-sm sm:p-4"
				>
					<dt className="text-xs font-medium text-muted-foreground">{label}</dt>
					<dd className="mt-1 text-2xl font-bold tabular-nums">{count}</dd>
				</div>
			))}
		</dl>
	);
}
