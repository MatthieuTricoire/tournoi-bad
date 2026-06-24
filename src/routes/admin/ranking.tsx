import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	getRankingData,
	getCurrentRoundData,
	getMatchHistory,
	updateMatchScore,
} from "#/server/functions/tournaments";
import { useState } from "react";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";

export const Route = createFileRoute("/admin/ranking")({
	loader: async () => {
		const [ranking, roundData, matchHistory] = await Promise.all([
			getRankingData(),
			getCurrentRoundData(),
			getMatchHistory(),
		]);
		return { ranking, roundData, matchHistory };
	},
	component: AdminRankingComponent,
});

function Podium({
	top3,
}: {
	top3: Array<{
		ranking: number;
		firstname: string;
		lastname: string;
		averageScore: number;
	}>;
}) {
	const colors = ["bg-yellow-400", "bg-gray-300", "bg-amber-600"];
	const emojis = ["🥇", "🥈", "🥉"];
	const heights = ["h-32", "h-24", "h-16"];

	return (
		<div className="flex items-end justify-center gap-4 mb-8">
			{[1, 0, 2].map((i) => {
				const entry = top3[i];
				if (!entry) return <div key={i} className="w-32" />;
				return (
					<div key={entry.ranking} className="flex flex-col items-center">
						<span className="text-4xl">{emojis[i]}</span>
						<p className="font-bold text-sm capitalize mt-1 text-center">
							{entry.firstname}
							<br />
							{entry.lastname}
						</p>
						<p className="text-xs text-muted-foreground">
							{entry.averageScore} pts/match
						</p>
						<div
							className={`w-20 sm:w-28 ${heights[i]} ${colors[i]} rounded-t-xl mt-2 flex items-end justify-center pb-2 shadow-md`}
						>
							<span className="text-white font-bold text-lg">
								#{entry.ranking}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

interface RankingEntry {
	ranking: number;
	id: number;
	firstname: string;
	lastname: string;
	playedGames: number;
	wins: number;
	losses: number;
	totalScore: number;
	averageScore: number;
}

const columnHelper = createColumnHelper<RankingEntry>();

const columns = [
	columnHelper.accessor("ranking", {
		header: "#",
		cell: (info) => (
			<span className="font-bold text-primary">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("firstname", {
		header: "Prénom",
		cell: (info) => (
			<span className="capitalize">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("lastname", {
		header: "Nom",
		cell: (info) => (
			<span className="capitalize">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("playedGames", {
		header: "Matchs joués",
	}),
	columnHelper.accessor("wins", {
		header: "Victoires",
		cell: (info) => (
			<span className="text-green-600 font-medium">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("losses", {
		header: "Défaites",
		cell: (info) => (
			<span className="text-red-500 font-medium">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("totalScore", {
		header: "Points totaux",
	}),
	columnHelper.accessor("averageScore", {
		header: "Moyenne pts/match",
	}),
];

	function AdminRankingComponent() {
	const { ranking, roundData, matchHistory } = Route.useLoaderData();
	const router = useRouter();
	const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
	const [editScore1, setEditScore1] = useState("");
	const [editScore2, setEditScore2] = useState("");
	const [isSavingScore, setIsSavingScore] = useState(false);

	async function handleEditScore(matchId: number) {
		if (!editScore1 || !editScore2) return;
		setIsSavingScore(true);
		try {
			await updateMatchScore({
				data: {
					matchId,
					scoreTeam1: parseInt(editScore1),
					scoreTeam2: parseInt(editScore2),
				},
			});
			setEditingMatchId(null);
			setEditScore1("");
			setEditScore2("");
			router.invalidate();
		} finally {
			setIsSavingScore(false);
		}
	}

	const table = useReactTable({
		data: ranking,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="container max-w-4xl mx-auto p-4 space-y-6">
			<nav className="flex gap-1 sm:gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-2">
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
			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					🏆 Classement
				</h1>
				<p className="text-muted-foreground">
					{roundData.status === "finished"
						? "Tournoi terminé — Classement final"
						: `Classement après le Round ${roundData.currentRound}`}
				</p>
			</div>

			{ranking.length > 0 && (
				<Podium top3={ranking.slice(0, 3)} />
			)}

			<div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="bg-muted/50">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="text-left p-3 font-semibold text-muted-foreground"
									>
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row, i) => (
							<tr
								key={row.id}
								className={`border-t transition-colors hover:bg-muted/20 ${i < 3 ? "bg-primary/5" : ""}`}
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="p-3">
										{flexRender(
											cell.column.columnDef.cell,
											cell.getContext(),
										)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{matchHistory.length > 0 && (
				<div className="space-y-6">
					<h2 className="text-xl font-bold tracking-tight">
						📋 Historique des matchs
					</h2>
					{matchHistory.map((round) => (
						<div key={round.round} className="rounded-xl border bg-card shadow-sm overflow-hidden">
							<div className="bg-muted/50 px-4 py-3 border-b">
								<span className="font-semibold text-sm">Round {round.round}</span>
							</div>
							<div className="divide-y">
								{round.matches.map((match) => (
									<div key={match.id} className="p-4">
										{editingMatchId === match.id ? (
											<form
												onSubmit={(e) => { e.preventDefault(); handleEditScore(match.id); }}
												className="flex items-center justify-center gap-2"
											>
												<input
													type="number"
													placeholder="T1"
													value={editScore1}
													onChange={(e) => setEditScore1(e.target.value)}
													className="w-16 h-9 rounded-md border border-input text-center font-mono text-sm"
													required
													min="0"
												/>
												<span className="font-bold text-sm">-</span>
												<input
													type="number"
													placeholder="T2"
													value={editScore2}
													onChange={(e) => setEditScore2(e.target.value)}
													className="w-16 h-9 rounded-md border border-input text-center font-mono text-sm"
													required
													min="0"
												/>
												<button
													type="submit"
													disabled={isSavingScore}
													className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium"
												>
													💾
												</button>
												<button
													type="button"
													onClick={() => setEditingMatchId(null)}
													className="h-9 px-2 rounded-md border border-input text-xs"
												>
													❌
												</button>
											</form>
										) : (
											<div className="flex items-center gap-3">
												<span className="text-xs text-muted-foreground font-mono shrink-0 w-16">
													Terrain {match.court}
												</span>
												<div className="flex-1 flex items-center gap-2 min-w-0">
													<span className="text-sm font-medium capitalize truncate text-right flex-1">
														{match.team1.map((p) => `${p.firstname} ${p.lastname}`).join(" / ")}
													</span>
													<button
														type="button"
														onClick={() => {
															setEditingMatchId(match.id);
															setEditScore1(String(match.team1[0]?.teamScore ?? ""));
															setEditScore2(String(match.team2[0]?.teamScore ?? ""));
														}}
														className="text-sm font-mono font-bold shrink-0 hover:text-primary transition-colors"
													>
														{match.team1[0]?.teamScore ?? "?"} - {match.team2[0]?.teamScore ?? "?"}
													</button>
													<span className="text-sm font-medium capitalize truncate flex-1">
														{match.team2.map((p) => `${p.firstname} ${p.lastname}`).join(" / ")}
													</span>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
