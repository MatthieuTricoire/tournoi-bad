import { LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import type { CourtMatch, ScoreResult, ScoreValues } from "./types";

const messages = {
	retry:
		"Le score n'a pas pu être enregistré. Vos valeurs sont conservées ; vous pouvez réessayer.",
	conflict:
		"Ce match ou sa rotation a changé, ou un résultat est déjà enregistré. Actualisez avant de poursuivre.",
	uncertain:
		"L'enregistrement n'a pas pu être confirmé. Actualisez avant de réessayer pour éviter un double envoi.",
};

export function ScoreForm({
	match,
	disabled,
	saving,
	locked,
	onSave,
	onCancel,
}: {
	match: CourtMatch;
	disabled: boolean;
	saving: boolean;
	locked: boolean;
	onSave: (values: ScoreValues) => Promise<ScoreResult>;
	onCancel: () => void;
}) {
	const [first, setFirst] = useState("");
	const [second, setSecond] = useState("");
	const [error, setError] = useState("");
	useEffect(() => {
		if (!locked) setError("");
	}, [locked]);
	const input = useRef<HTMLInputElement>(null);
	const inFlight = useRef(false);
	useEffect(() => {
		input.current?.focus({ preventScroll: true });
	}, []);
	const prefix = `score-${match.id}`;
	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (disabled || locked || inFlight.current) return;
		const scores = [first, second].map((value) => Number(value));
		if (
			[first, second].some((value) => value.trim() === "") ||
			scores.some((value) => !Number.isSafeInteger(value) || value < 0)
		) {
			setError(
				"Saisissez un entier supérieur ou égal à zéro pour chaque équipe.",
			);
			return;
		}
		inFlight.current = true;
		setError("");
		try {
			const result = await onSave({
				scoreTeam1: scores[0],
				scoreTeam2: scores[1],
			});
			if (result !== "saved") setError(messages[result]);
		} catch {
			setError(messages.uncertain);
		} finally {
			inFlight.current = false;
		}
	}
	return (
		<form
			onSubmit={submit}
			noValidate
			aria-label={`Score du terrain ${match.court}`}
			className="space-y-4 border-t pt-4"
		>
			<fieldset
				disabled={disabled || locked}
				className="grid min-w-0 grid-cols-2 gap-3"
			>
				<legend className="sr-only">Résultat du terrain {match.court}</legend>
				{[
					{ value: first, set: setFirst, team: 1, ref: input },
					{ value: second, set: setSecond, team: 2, ref: undefined },
				].map(({ value, set, team, ref }) => (
					<div key={team} className="min-w-0 space-y-2">
						<Label htmlFor={`${prefix}-${team}`}>Score équipe {team}</Label>
						<Input
							ref={ref}
							id={`${prefix}-${team}`}
							type="number"
							inputMode="numeric"
							min="0"
							step="1"
							required
							value={value}
							onChange={(e) => set(e.target.value)}
							aria-invalid={Boolean(error)}
							aria-describedby={error ? `${prefix}-error` : undefined}
							className="h-16 scroll-mb-24 bg-background text-center text-3xl font-bold tabular-nums md:text-3xl"
						/>
					</div>
				))}
			</fieldset>
			{error && (
				<p
					id={`${prefix}-error`}
					role="alert"
					className="text-sm text-destructive"
				>
					{error}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<Button
					type="submit"
					disabled={disabled || locked}
					className="min-h-11 flex-1"
				>
					{saving ? (
						<LoaderCircle
							aria-hidden="true"
							className="size-4 motion-safe:animate-spin"
						/>
					) : (
						<Save aria-hidden="true" className="size-4" />
					)}
					{saving ? "Enregistrement…" : "Valider le score"}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={disabled}
					onClick={onCancel}
					className="min-h-11"
				>
					<X aria-hidden="true" className="size-4" />
					Annuler
				</Button>
			</div>
		</form>
	);
}
