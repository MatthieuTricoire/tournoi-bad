import { CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { CourtCard } from "./court-card";
import { TournamentOverview } from "./tournament-overview";
import { TournamentDetails } from "./tournament-planning";
import {
	type CourtMatch,
	type DashboardActions,
	type DashboardData,
	matchVersion,
	type ScoreResult,
	type ScoreValues,
} from "./types";

export function TournamentDashboard({
	data,
	actions,
	fetching = false,
}: {
	data: DashboardData;
	actions: DashboardActions;
	fetching?: boolean;
}) {
	const [operation, setOperation] = useState<
		"refresh" | "generate" | "finish" | "score" | null
	>(null);
	const [editor, setEditor] = useState<{ id: number; version: string } | null>(
		null,
	);
	const [mustRefresh, setMustRefresh] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [confirmFinish, setConfirmFinish] = useState(false);
	const lock = useRef(false);
	const busy = operation !== null || fetching;
	const { round } = data;
	const allFinished = round.matches.every((m) => m.status === "finished");
	const closed = round.status === "finished";
	const firstRound = round.currentRound === 0;
	const currentEditor = editor
		? round.matches.find((m) => m.id === editor.id)
		: undefined;
	const changed = Boolean(
		editor &&
			matchVersion(currentEditor, round.currentRound) !== editor.version,
	);
	useEffect(() => {
		if (changed) {
			setEditor(null);
			setNotice(
				"Le match ou la rotation a changé sur un autre appareil. L'affichage est actualisé ; consultez le résultat avant de poursuivre.",
			);
		}
	}, [changed]);

	async function refresh() {
		if (lock.current || fetching) return;
		lock.current = true;
		setOperation("refresh");
		setError("");
		setNotice("");
		try {
			await actions.refresh();
			setMustRefresh(false);
			setNotice("Données actualisées.");
		} catch {
			setError(
				"Actualisation impossible. Le dernier affichage et votre saisie sont conservés. Réessayez lorsque la connexion est disponible.",
			);
		} finally {
			lock.current = false;
			setOperation(null);
		}
	}
	async function mutate(kind: "generate" | "finish") {
		if (lock.current || fetching || mustRefresh) return;
		lock.current = true;
		setOperation(kind);
		setError("");
		setNotice("");
		let succeeded = false;
		try {
			await (kind === "generate" ? actions.generate() : actions.finish());
			succeeded = true;
			setEditor(null);
			setConfirmFinish(false);
			setNotice(
				kind === "generate"
					? "Rotation prise en compte."
					: "Tournoi clôturé. Les corrections restent possibles dans le classement.",
			);
			await actions.refresh();
		} catch {
			setConfirmFinish(false);
			setMustRefresh(true);
			setError(
				succeeded
					? "L'action a réussi, mais l'affichage n'a pas pu être actualisé. Actualisez avant de continuer."
					: "L'action n'a pas pu être confirmée. Actualisez les données avant de réessayer.",
			);
		} finally {
			lock.current = false;
			setOperation(null);
		}
	}
	async function save(
		match: CourtMatch,
		values: ScoreValues,
	): Promise<ScoreResult> {
		if (
			lock.current ||
			fetching ||
			mustRefresh ||
			!editor ||
			editor.version !== matchVersion(match, round.currentRound)
		)
			return "conflict";
		lock.current = true;
		setOperation("score");
		setError("");
		setNotice("");
		try {
			const result = await actions.saveScore(match, round.currentRound, values);
			if (result === "saved") {
				setEditor(null);
				setNotice(`Score du terrain ${match.court} enregistré.`);
				try {
					await actions.refresh();
				} catch {
					setMustRefresh(true);
					setError(
						"Le score est enregistré, mais l'affichage n'a pas pu être actualisé. Actualisez avant de continuer.",
					);
				}
			} else if (result !== "retry") setMustRefresh(true);
			return result;
		} catch {
			setMustRefresh(true);
			return "uncertain";
		} finally {
			lock.current = false;
			setOperation(null);
		}
	}

	return (
		<div className="space-y-6">
			<header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
				<div>
					<p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">
						Organisation du tournoi
					</p>
					<h1 className="text-3xl font-bold tracking-tight">Tournoi</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{closed
							? "Résultats conservés, corrections possibles dans le classement."
							: firstRound
								? "Préparez les joueurs et les terrains, puis lancez la première rotation."
								: "Les terrains et les résultats de la rotation en cours."}
					</p>
				</div>
				<div className="shrink-0 space-y-1 sm:text-right">
					<Button
						type="button"
						variant="outline"
						onClick={refresh}
						disabled={busy}
						className="min-h-11"
					>
						<RefreshCw
							aria-hidden="true"
							className={`size-4 ${operation === "refresh" || fetching ? "motion-safe:animate-spin" : ""}`}
						/>
						{operation === "refresh" || fetching
							? "Actualisation…"
							: "Actualiser"}
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
			{notice && (
				<output className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
					<CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
					{notice}
				</output>
			)}
			{error && (
				<p
					role="alert"
					className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				>
					{error}
				</p>
			)}
			{mustRefresh && (
				<p className="rounded-lg border bg-muted p-3 text-sm font-medium">
					Actualisation nécessaire avant toute nouvelle opération.
				</p>
			)}
			<TournamentOverview
				data={data}
				busy={busy}
				mustRefresh={mustRefresh}
				generating={operation === "generate"}
				onGenerate={() => mutate("generate")}
				onFinish={() => setConfirmFinish(true)}
			/>
			{round.matches.length > 0 && (
				<section
					aria-label="Terrains"
					className="grid items-start gap-4 md:grid-cols-2"
				>
					{round.matches.map((match) => (
						<CourtCard
							key={match.id}
							match={match}
							editing={editor?.id === match.id && !changed}
							disabled={busy || closed}
							saving={operation === "score" && editor?.id === match.id}
							locked={mustRefresh}
							onEdit={() => {
								if (!busy && !mustRefresh)
									setEditor({
										id: match.id,
										version: matchVersion(match, round.currentRound),
									});
							}}
							onCancel={() => {
								if (!busy) setEditor(null);
							}}
							onSave={(values) => save(match, values)}
						/>
					))}
				</section>
			)}
			<TournamentDetails data={data} />
			<Dialog
				open={confirmFinish}
				onOpenChange={(open) => {
					if (!busy) setConfirmFinish(open);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Terminer le tournoi ?</DialogTitle>
						<DialogDescription>
							Les résultats seront conservés. Les scores des matchs terminés
							resteront corrigeables depuis le classement.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-wrap justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							className="min-h-11"
							disabled={busy}
							onClick={() => setConfirmFinish(false)}
						>
							Annuler
						</Button>
						<Button
							type="button"
							className="min-h-11"
							disabled={busy || !allFinished || mustRefresh}
							onClick={() => mutate("finish")}
						>
							{operation === "finish" ? "Clôture…" : "Confirmer la clôture"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
