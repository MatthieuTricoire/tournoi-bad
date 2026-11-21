import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Switch } from "#/components/ui/switch";
import type { Player } from "./types";

export type PlayerIssue = {
	message: string;
	needsRefresh?: boolean;
	history?: boolean;
};

export function PlayerRow({
	player,
	disabled,
	pending,
	issue,
	onPresence,
	onRemove,
	onRemovedFocus,
}: {
	player: Player;
	disabled: boolean;
	pending: "presence" | "delete" | null;
	issue?: PlayerIssue;
	onPresence: () => void;
	onRemove: () => Promise<void>;
	onRemovedFocus: () => void;
}) {
	const [open, setOpen] = useState(false);
	const trigger = useRef<HTMLButtonElement>(null);
	const deleteFlight = useRef(false);
	const name = `${player.firstname} ${player.lastname}`.trim();
	const blocked = disabled || Boolean(issue?.needsRefresh);
	return (
		<li className="p-4 sm:p-5" aria-labelledby={`player-name-${player.id}`}>
			<div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
				<div className="min-w-0">
					<h3
						id={`player-name-${player.id}`}
						className="font-bold [overflow-wrap:anywhere]"
					>
						{name}
					</h3>
					<p className="mt-1 text-xs text-muted-foreground">
						Participations attribuées :{" "}
						<span className="font-semibold tabular-nums text-foreground">
							{player.playedGames}
						</span>
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
					<label
						htmlFor={`presence-${player.id}`}
						className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
					>
						<Switch
							id={`presence-${player.id}`}
							className="scroll-mb-24"
							checked={player.present}
							onCheckedChange={onPresence}
							disabled={blocked}
							aria-label={`Présence de ${name}`}
							aria-describedby={issue ? `issue-${player.id}` : undefined}
						/>
						<span
							className={`min-w-16 text-sm font-semibold ${player.present ? "text-primary" : "text-muted-foreground"}`}
						>
							{player.present ? "Présent" : "Absent"}
						</span>
					</label>
					{!issue?.history && (
						<Dialog
							open={open}
							onOpenChange={(value) => {
								if (!pending) setOpen(value);
							}}
						>
							<DialogTrigger asChild>
								<Button
									ref={trigger}
									type="button"
									variant="ghost"
									disabled={blocked}
									className="scroll-mb-24 min-h-11 text-muted-foreground hover:text-destructive"
									aria-label={`Supprimer ${name}`}
								>
									<Trash2 className="size-4" aria-hidden="true" />
									Supprimer
								</Button>
							</DialogTrigger>
							<DialogContent
								className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-xl [overflow-wrap:anywhere]"
								onCloseAutoFocus={(event) => {
									// Radix restores the trigger when it still exists. If a successful
									// reload removed that row, return to the list heading instead.
									if (
										!trigger.current?.isConnected ||
										trigger.current.disabled
									) {
										event.preventDefault();
										onRemovedFocus();
									}
								}}
							>
								<DialogHeader>
									<DialogTitle className="pr-6 leading-snug">
										Supprimer {name} ?
									</DialogTitle>
									<DialogDescription>
										Le joueur sera retiré de la liste. La suppression est
										autorisée uniquement sans historique de match. Sinon,
										marquez-le absent pour conserver ses résultats.
									</DialogDescription>
								</DialogHeader>
								<div className="flex flex-wrap justify-end gap-2">
									<DialogClose asChild>
										<Button
											variant="outline"
											type="button"
											disabled={Boolean(pending)}
											className="scroll-mb-24 min-h-11"
										>
											Annuler
										</Button>
									</DialogClose>
									<Button
										type="button"
										variant="destructive"
										disabled={blocked}
										className="scroll-mb-24 min-h-11"
										onClick={async () => {
											if (deleteFlight.current || blocked) return;
											deleteFlight.current = true;
											try {
												await onRemove();
												setOpen(false);
											} finally {
												deleteFlight.current = false;
											}
										}}
									>
										{pending === "delete"
											? "Suppression…"
											: "Confirmer la suppression"}
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					)}
				</div>
			</div>
			{pending === "presence" && (
				<output className="mt-2 block text-sm text-muted-foreground">
					Mise à jour de la présence…
				</output>
			)}
			{issue?.needsRefresh && (
				<p className="mt-2 text-xs font-medium text-muted-foreground">
					Dernier état lu · actualisation nécessaire
				</p>
			)}
			{issue && (
				<p
					id={`issue-${player.id}`}
					role="alert"
					className="mt-2 text-sm text-destructive"
				>
					{issue.message}
				</p>
			)}
		</li>
	);
}
