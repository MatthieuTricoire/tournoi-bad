import { useRef, useState } from "react";
import { MatchHistory } from "./match-history";
import {
	RankingHeader,
	RankingHonours,
	RankingTable,
} from "./ranking-overview";
import { ScoreCorrection } from "./score-correction";
import {
	type CorrectionResult,
	type CorrectionValues,
	type HistoryMatch,
	historyVersion,
	type RankingActions,
	type RankingData,
} from "./types";

type Editor = {
	match: HistoryMatch;
	round: number;
	version: string;
	trigger: HTMLButtonElement;
};

export function RankingPage({
	data,
	actions,
	fetching = false,
}: {
	data: RankingData;
	actions: RankingActions;
	fetching?: boolean;
}) {
	const [editor, setEditor] = useState<Editor | null>(null);
	const [operation, setOperation] = useState<"save" | "refresh" | null>(null);
	const [mustRefresh, setMustRefresh] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const lock = useRef(false);
	const fallback = useRef<HTMLDivElement>(null);
	const busy = operation !== null || fetching;
	const current = editor
		? data.history
				.find((r) => r.round === editor.round)
				?.matches.find((m) => m.id === editor.match.id)
		: undefined;
	const stale = Boolean(
		editor && editor.version !== historyVersion(current, editor.round),
	);
	async function refresh() {
		if (lock.current || fetching) return;
		lock.current = true;
		setOperation("refresh");
		setError("");
		setNotice("");
		try {
			await actions.refresh();
			setMustRefresh(false);
			setNotice("Classement et historique actualisés.");
		} catch {
			setError(
				"Actualisation impossible. Le dernier classement, l'historique et votre saisie sont conservés. Réessayez lorsque la connexion est disponible.",
			);
		} finally {
			lock.current = false;
			setOperation(null);
		}
	}
	async function save(values: CorrectionValues): Promise<CorrectionResult> {
		if (!editor || stale || mustRefresh || lock.current || fetching)
			return "conflict";
		lock.current = true;
		setOperation("save");
		setError("");
		setNotice("");
		let result: CorrectionResult = "uncertain";
		try {
			result = await actions.correct(editor.match, editor.round, values);
			if (result === "saved") {
				setNotice(
					`Score corrigé — rotation ${editor.round}, terrain ${editor.match.court}.`,
				);
				try {
					await actions.refresh();
				} catch {
					setMustRefresh(true);
					setError(
						"Le score est corrigé, mais le classement et l'historique n'ont pas pu être actualisés. Actualisez avant toute nouvelle correction.",
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
			if (result === "saved") setEditor(null);
		}
	}
	return (
		<div className="space-y-6">
			<RankingHeader
				data={data}
				busy={busy}
				refreshing={operation === "refresh" || fetching}
				onRefresh={refresh}
			/>
			{operation === "refresh" && (
				<output className="block text-sm text-muted-foreground">
					Actualisation du classement et de l'historique…
				</output>
			)}
			{notice && (
				<output className="block rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
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
			{mustRefresh && !editor && (
				<p className="rounded-lg border bg-muted p-3 text-sm font-medium">
					Actualisation nécessaire avant toute nouvelle correction.
				</p>
			)}
			{data.ranking.length === 0 ? (
				<p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
					Le classement apparaîtra après le premier match terminé.
				</p>
			) : (
				<>
					<RankingHonours ranking={data.ranking} />
					<RankingTable ranking={data.ranking} />
				</>
			)}
			<div
				ref={fallback}
				tabIndex={-1}
				className="focus-visible:outline-2 focus-visible:outline-ring"
			>
				<MatchHistory
					history={data.history}
					disabled={busy || mustRefresh}
					onEdit={(match, round, trigger) => {
						if (!busy && !mustRefresh)
							setEditor({
								match,
								round,
								version: historyVersion(match, round),
								trigger,
							});
					}}
				/>
			</div>
			{editor && (
				<ScoreCorrection
					key={`${editor.round}-${editor.match.id}`}
					match={editor.match}
					round={editor.round}
					busy={busy}
					saving={operation === "save"}
					refreshing={operation === "refresh" || fetching}
					locked={mustRefresh}
					stale={stale}
					refreshError={error}
					onClose={() => {
						if (!busy) setEditor(null);
					}}
					onReturnFocus={() => {
						if (editor.trigger.isConnected && !editor.trigger.disabled)
							editor.trigger.focus({ preventScroll: true });
						else fallback.current?.focus({ preventScroll: true });
					}}
					onRefresh={refresh}
					onSave={save}
				/>
			)}
		</div>
	);
}
