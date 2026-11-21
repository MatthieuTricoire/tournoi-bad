import { UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { type NewPlayer, validatePlayer } from "./types";

export function AddPlayerForm({
	disabled,
	adding,
	error,
	onAdd,
}: {
	disabled: boolean;
	adding: boolean;
	error: string;
	onAdd: (values: NewPlayer) => Promise<boolean>;
}) {
	const [values, setValues] = useState<NewPlayer>({
		firstname: "",
		lastname: "",
		gender: "M",
	});
	const [errors, setErrors] = useState({ firstname: "", lastname: "" });
	const first = useRef<HTMLInputElement>(null);
	const flight = useRef(false);
	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (disabled || flight.current) return;
		const next = validatePlayer(values);
		setErrors(next);
		if (next.firstname || next.lastname) {
			if (next.firstname) first.current?.focus();
			return;
		}
		flight.current = true;
		try {
			if (await onAdd(values)) {
				setValues({ firstname: "", lastname: "", gender: values.gender });
				// Read-only inputs remain focusable, including when the add succeeded
				// but the subsequent refresh failed.
				first.current?.focus({ preventScroll: true });
			}
		} finally {
			flight.current = false;
		}
	}
	return (
		<section
			aria-labelledby="add-player-title"
			className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
		>
			<h2 id="add-player-title" className="text-xl font-bold">
				Ajouter un joueur
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				Le joueur sera présent dès son inscription. Le nom est facultatif.
			</p>
			<form
				onSubmit={submit}
				noValidate
				aria-label="Ajouter un joueur"
				className="mt-5 space-y-4"
			>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_10rem]">
					{(["firstname", "lastname"] as const).map((field) => (
						<div key={field} className="min-w-0 space-y-2">
							<Label htmlFor={`player-${field}`}>
								{field === "firstname" ? "Prénom" : "Nom (facultatif)"}
							</Label>
							<Input
								ref={field === "firstname" ? first : undefined}
								id={`player-${field}`}
								autoComplete={
									field === "firstname" ? "given-name" : "family-name"
								}
								required={field === "firstname"}
								minLength={field === "firstname" ? 2 : undefined}
								maxLength={50}
								value={values[field]}
								readOnly={adding}
								onChange={(e) =>
									setValues({ ...values, [field]: e.target.value })
								}
								aria-invalid={Boolean(errors[field])}
								aria-describedby={
									errors[field] ? `player-${field}-error` : undefined
								}
								className="scroll-mb-24 min-h-11 bg-background text-base md:text-base"
							/>
							{errors[field] && (
								<p
									role="alert"
									id={`player-${field}-error`}
									className="text-sm text-destructive"
								>
									{errors[field]}
								</p>
							)}
						</div>
					))}
					<div className="space-y-2">
						<Label htmlFor="player-gender">Genre</Label>
						<select
							id="player-gender"
							value={values.gender}
							disabled={adding}
							onChange={(e) =>
								setValues({ ...values, gender: e.target.value as "M" | "F" })
							}
							className="scroll-mb-24 min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
						>
							<option value="M">Homme</option>
							<option value="F">Femme</option>
						</select>
					</div>
				</div>
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				<Button
					type="submit"
					disabled={disabled}
					className="scroll-mb-24 min-h-11 w-full whitespace-normal sm:w-auto"
				>
					<UserPlus aria-hidden="true" className="size-4" />
					{adding ? "Ajout en cours…" : "Ajouter le joueur"}
				</Button>
			</form>
		</section>
	);
}
