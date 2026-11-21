import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import type { CorrectionResult, CorrectionValues, HistoryMatch } from "./types";

export function ScoreCorrection({
	match,
	round,
	busy,
	saving,
	refreshing,
	locked,
	stale,
	refreshError,
	onClose,
	onReturnFocus,
	onRefresh,
	onSave,
}: {
	match: HistoryMatch;
	round: number;
	busy: boolean;
	saving: boolean;
	refreshing: boolean;
	locked: boolean;
	stale: boolean;
	refreshError: string;
	onClose: () => void;
	onReturnFocus: () => void;
	onRefresh: () => void;
	onSave: (values: CorrectionValues) => Promise<CorrectionResult>;
}) {
	const [first, setFirst] = useState(String(match.team1[0]?.teamScore ?? ""));
	const [second, setSecond] = useState(String(match.team2[0]?.teamScore ?? ""));
	const [error, setError] = useState("");
	useEffect(() => {
		if (!locked) setError("");
	}, [locked]);
	const flight = useRef(false);
	const firstInput = useRef<HTMLInputElement>(null);
	const message = stale
		? "Le match a été modifié depuis l'ouverture. Votre saisie est conservée. Fermez puis rouvrez la correction pour consulter les scores actualisés."
		: locked
			? `Actualisation nécessaire : ${error || "vérifiez le résultat avant de reprendre la correction."}`
			: error;
	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (busy || locked || stale || flight.current) return;
		const scores = [first, second].map(Number);
		if (
			[first, second].some((s) => s.trim() === "") ||
			scores.some((s) => !Number.isSafeInteger(s) || s < 0)
		) {
			setError(
				"Saisissez un entier supérieur ou égal à zéro pour chaque équipe.",
			);
			return;
		}
		flight.current = true;
		setError("");
		try {
			const result = await onSave({
				scoreTeam1: scores[0],
				scoreTeam2: scores[1],
			});
			if (result === "retry")
				setError(
					"Vérification du match impossible. Aucun score n'a été envoyé. Vos valeurs sont conservées ; réessayez lorsque la connexion est disponible.",
				);
			if (result === "conflict")
				setError(
					"Ce match a changé ou n'est plus disponible. Actualisez, puis fermez et rouvrez la correction pour vérifier les nouveaux scores.",
				);
			if (result === "uncertain")
				setError(
					"La correction n'a pas pu être confirmée. Actualisez les données et vérifiez le résultat avant tout nouvel essai.",
				);
		} catch {
			setError(
				"La correction n'a pas pu être confirmée. Actualisez les données avant de réessayer.",
			);
		} finally {
			flight.current = false;
		}
	}
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
		>
			<DialogContent
				className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-xl"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					firstInput.current?.focus({ preventScroll: true });
					firstInput.current?.select();
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					onReturnFocus();
				}}
			>
				<DialogHeader>
					<DialogTitle className="pr-6 leading-snug">
						Modifier le score — rotation {round}, terrain {match.court}
					</DialogTitle>
					<DialogDescription>
						Les points et le classement seront actualisés après confirmation.
						Évitez de corriger ce match simultanément sur plusieurs appareils.
					</DialogDescription>
				</DialogHeader>
				<form
					aria-label={`Correction rotation ${round}, terrain ${match.court}`}
					noValidate
					onSubmit={submit}
					className="space-y-4"
				>
					<fieldset
						disabled={busy || locked || stale}
						className="grid min-w-0 gap-4 sm:grid-cols-2"
					>
						<legend className="sr-only">Scores du match terminé</legend>
						{[
							{ team: match.team1, value: first, set: setFirst },
							{ team: match.team2, value: second, set: setSecond },
						].map(({ team, value, set }, index) => (
							<div
								key={index === 0 ? "team1" : "team2"}
								className="min-w-0 space-y-2 rounded-lg border p-3"
							>
								<Label htmlFor={`correction-score-${index + 1}`}>
									Score équipe {index + 1}
								</Label>
								<ul
									id={`correction-team-${index + 1}`}
									className="space-y-1 text-sm [overflow-wrap:anywhere]"
								>
									{team.map((p) => (
										<li key={p.playerId}>
											{p.firstname} {p.lastname}
										</li>
									))}
								</ul>
								<Input
									ref={index === 0 ? firstInput : undefined}
									id={`correction-score-${index + 1}`}
									type="number"
									inputMode="numeric"
									min="0"
									step="1"
									required
									value={value}
									onChange={(e) => set(e.target.value)}
									aria-invalid={Boolean(message)}
									aria-describedby={`correction-team-${index + 1}${message ? " correction-error" : ""}`}
									className="h-16 scroll-mb-24 bg-background text-center text-3xl font-bold tabular-nums md:text-3xl"
								/>
							</div>
						))}
					</fieldset>
					{message && (
						<p
							id="correction-error"
							role="alert"
							className="text-sm text-destructive"
						>
							{message}
						</p>
					)}
					{refreshError && (
						<p role="alert" className="text-sm text-destructive">
							{refreshError}
						</p>
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							type="submit"
							disabled={busy || locked || stale}
							className="min-h-11 scroll-mb-24 flex-1 whitespace-normal"
						>
							{saving ? "Enregistrement…" : "Enregistrer la correction"}
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={busy}
							className="min-h-11 scroll-mb-24"
							onClick={onClose}
						>
							Annuler
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={busy}
							className="min-h-11 w-full scroll-mb-24"
							onClick={onRefresh}
						>
							{refreshing ? "Actualisation…" : "Actualiser les données"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
