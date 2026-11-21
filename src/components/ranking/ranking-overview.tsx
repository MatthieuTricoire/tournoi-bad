import { Medal, RefreshCw, Trophy } from "lucide-react";
import { Button } from "#/components/ui/button";
import { formatAverage, type RankingData, type RankingEntry } from "./types";

export function RankingHeader({
	data,
	busy,
	refreshing,
	onRefresh,
}: {
	data: RankingData;
	busy: boolean;
	refreshing: boolean;
	onRefresh: () => void;
}) {
	return (
		<header className="space-y-4">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
				<div>
					<p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">
						Résultats du tournoi
					</p>
					<h1 className="text-3xl font-bold tracking-tight">Classement</h1>
					<p className="mt-2 text-sm font-medium text-primary">
						{data.round.status === "finished"
							? "Tournoi terminé — les scores des matchs terminés peuvent encore être corrigés."
							: "Classement provisoire — matchs terminés uniquement."}
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
			</div>
			<p className="text-sm text-muted-foreground">
				Classement individuel par moyenne de points par match terminé, puis par
				total de points. Les égalités parfaites partagent le même rang. Chaque
				joueur reçoit les points de son équipe, même en cas de défaite.
			</p>
		</header>
	);
}

const honoursPlaces = [
	{
		rank: 1,
		label: "1re place",
		medal: "bg-amber-50 text-amber-800 ring-amber-200",
	},
	{
		rank: 2,
		label: "2e place",
		medal: "bg-slate-100 text-slate-600 ring-slate-200",
	},
	{
		rank: 3,
		label: "3e place",
		medal: "bg-orange-50 text-orange-800 ring-orange-200",
	},
] as const;

export function RankingHonours({ ranking }: { ranking: RankingEntry[] }) {
	return (
		<section
			aria-labelledby="honours-title"
			className="rounded-xl border bg-card px-4 py-3 shadow-sm sm:px-5"
		>
			<h2
				id="honours-title"
				className="mb-1 flex items-center gap-2 text-xl font-bold"
			>
				<Trophy aria-hidden="true" className="size-5 text-primary" />
				Palmarès
			</h2>
			<div className="divide-y">
				{honoursPlaces.map((place) => {
					const entries = ranking.filter(
						(player) => player.ranking === place.rank,
					);
					if (!entries.length) return null;
					return (
						<section
							key={place.rank}
							aria-label={`Rang ${place.rank}`}
							className="grid gap-2 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4"
						>
							<div className="flex items-start gap-2.5">
								<span
									aria-hidden="true"
									className={`flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${place.medal}`}
								>
									<Medal className="size-5" />
								</span>
								<div className="min-w-0 pt-0.5">
									<h3 className="font-bold text-primary">{place.label}</h3>
									{entries.length > 1 && (
										<p className="text-xs text-muted-foreground">
											{entries.length} joueurs ex æquo
										</p>
									)}
								</div>
							</div>
							<ul className="grid min-w-0 gap-x-5 gap-y-2 md:grid-cols-2">
								{entries.map((player) => (
									<li
										key={player.id}
										className="min-w-0 border-l-2 border-primary/15 py-0.5 pl-3"
									>
										<p className="text-sm font-bold [overflow-wrap:anywhere]">
											{player.firstname} {player.lastname}
										</p>
										<p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-xs">
											<span className="font-bold tabular-nums text-primary">
												{formatAverage(player.averageScore)} pts/match
											</span>
											<span className="text-muted-foreground">
												· {player.playedGames} match
												{player.playedGames !== 1 ? "s" : ""} terminé
												{player.playedGames !== 1 ? "s" : ""}
											</span>
										</p>
									</li>
								))}
							</ul>
						</section>
					);
				})}
			</div>
		</section>
	);
}

export function RankingTable({ ranking }: { ranking: RankingEntry[] }) {
	return (
		<section
			aria-labelledby="ranking-table-title"
			className="overflow-hidden rounded-xl border bg-card shadow-sm"
		>
			<div className="border-b p-4 sm:p-5">
				<h2 id="ranking-table-title" className="text-xl font-bold">
					Classement individuel
				</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Moyennes affichées à deux décimales. Les rangs tiennent compte des
					valeurs exactes, avant arrondi.
				</p>
			</div>
			<table className="hidden w-full table-fixed text-sm md:table">
				<caption className="sr-only">
					Classement individuel — matchs terminés uniquement
				</caption>
				<thead className="bg-muted/50 text-xs text-muted-foreground">
					<tr>
						<th scope="col" className="w-16 p-4 text-left">
							Rang
						</th>
						<th scope="col" className="p-4 text-left">
							Joueur
						</th>
						<th scope="col" className="w-28 p-4 text-right">
							Moyenne
						</th>
						<th scope="col" className="w-28 p-4 text-right">
							Matchs terminés
						</th>
						<th scope="col" className="w-28 p-4 text-right">
							Total des points
						</th>
					</tr>
				</thead>
				<tbody className="divide-y">
					{ranking.map((p) => (
						<tr key={p.id}>
							<td className="p-4 font-bold tabular-nums text-primary">
								{p.ranking}
							</td>
							<th
								scope="row"
								className="p-4 text-left font-semibold [overflow-wrap:anywhere]"
							>
								{p.firstname} {p.lastname}
							</th>
							<td className="p-4 text-right font-bold tabular-nums">
								{formatAverage(p.averageScore)}
							</td>
							<td className="p-4 text-right tabular-nums">{p.playedGames}</td>
							<td className="p-4 text-right tabular-nums">{p.totalScore}</td>
						</tr>
					))}
				</tbody>
			</table>
			<ul aria-label="Classement sur mobile" className="divide-y md:hidden">
				{ranking.map((p) => (
					<li key={p.id} className="space-y-3 p-4">
						<div className="flex items-start gap-3">
							<span className="rounded-lg bg-primary/10 px-3 py-2 font-bold tabular-nums text-primary">
								<span className="sr-only">Rang </span>
								{p.ranking}
							</span>
							<h3 className="min-w-0 pt-2 font-bold [overflow-wrap:anywhere]">
								{p.firstname} {p.lastname}
							</h3>
						</div>
						<dl className="grid grid-cols-2 gap-3">
							<div>
								<dt className="text-xs text-muted-foreground">Moyenne</dt>
								<dd className="text-xl font-bold tabular-nums">
									{formatAverage(p.averageScore)}{" "}
									<span className="text-xs font-medium">pts/match</span>
								</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground">
									Matchs terminés
								</dt>
								<dd className="text-xl font-bold tabular-nums">
									{p.playedGames}
								</dd>
							</div>
						</dl>
						<p className="text-xs text-muted-foreground">
							Total des points :{" "}
							<span className="font-semibold tabular-nums text-foreground">
								{p.totalScore}
							</span>
						</p>
					</li>
				))}
			</ul>
		</section>
	);
}
