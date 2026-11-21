import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { AddPlayerForm } from "./add-player-form";
import { type PlayerIssue, PlayerRow } from "./player-row";
import { PlayersCounts, PlayersHeader } from "./players-overview";
import type { NewPlayer, Player, PlayersActions, PlayersData } from "./types";

const historyRefusal =
	"Ce joueur a déjà participé à un match. Marquez-le absent pour les prochaines rotations.";

export function PlayersManager({
	data,
	actions,
	fetching = false,
}: {
	data: PlayersData;
	actions: PlayersActions;
	fetching?: boolean;
}) {
	const [pending, setPending] = useState<string | null>(null);
	const lock = useRef(false);
	const [issues, setIssues] = useState<Record<number, PlayerIssue>>({});
	const [addError, setAddError] = useState("");
	const [addBlocked, setAddBlocked] = useState(false);
	const [refreshError, setRefreshError] = useState("");
	const [notice, setNotice] = useState("");
	const [search, setSearch] = useState("");
	const heading = useRef<HTMLHeadingElement>(null);
	const busy = pending !== null || fetching;
	const present = data.players.filter((p) => p.present).length;
	const needle = search.toLocaleLowerCase("fr").trim();
	const visible = data.players.filter((p) =>
		`${p.firstname} ${p.lastname}`.toLocaleLowerCase("fr").includes(needle),
	);
	function begin(operation: string) {
		if (lock.current || fetching) return false;
		lock.current = true;
		setPending(operation);
		setNotice("");
		return true;
	}
	function end() {
		lock.current = false;
		setPending(null);
	}
	async function refresh() {
		if (!begin("refresh")) return;
		setRefreshError("");
		try {
			await actions.refresh();
			setIssues((current) =>
				Object.fromEntries(
					Object.entries(current).map(([id, issue]) => [
						id,
						issue.needsRefresh
							? {
									history: issue.history,
									message: issue.history
										? "Les présences ont été relues. Ce joueur possède un historique à conserver ; marquez-le absent si nécessaire."
										: "Les données ont été relues. Vérifiez l'état du joueur avant de réessayer.",
								}
							: issue,
					]),
				),
			);
			if (addBlocked)
				setAddError(
					"Liste actualisée. Vérifiez si le joueur est déjà inscrit avant de réessayer l'ajout.",
				);
			setAddBlocked(false);
			setNotice("Liste des joueurs actualisée.");
		} catch {
			setRefreshError(
				"Actualisation impossible. La liste, votre formulaire et les erreurs sont conservés. Réessayez lorsque la connexion est disponible.",
			);
		} finally {
			end();
		}
	}
	async function add(values: NewPlayer) {
		if (addBlocked || !begin("add")) return false;
		setAddError("");
		let confirmed = false;
		try {
			await actions.add(values);
			confirmed = true;
			setNotice(
				`${values.firstname} ${values.lastname} ajouté. Le joueur est présent.`,
			);
			await actions.refresh();
			setRefreshError("");
		} catch {
			setAddBlocked(true);
			setAddError(
				confirmed
					? "Le joueur est ajouté, mais la liste n'a pas pu être actualisée. Actualisez avant d'inscrire le suivant."
					: "Ajout non confirmé. Vos valeurs sont conservées. Actualisez et vérifiez la liste avant de réessayer pour éviter un doublon.",
			);
		} finally {
			end();
		}
		return confirmed;
	}
	async function mutate(player: Player, kind: "presence" | "delete") {
		if (
			issues[player.id]?.needsRefresh ||
			(kind === "delete" && issues[player.id]?.history) ||
			!begin(`${kind}:${player.id}`)
		)
			return;
		setIssues((current) => {
			const next = { ...current };
			if (!next[player.id]?.history) delete next[player.id];
			return next;
		});
		let confirmed = false;
		try {
			await (kind === "presence"
				? actions.presence(player.id, !player.present)
				: actions.remove(player.id));
			confirmed = true;
			await actions.refresh();
			setRefreshError("");
			setNotice(
				kind === "presence"
					? "Présence prise en compte. Présences actualisées."
					: `${player.firstname} ${player.lastname} supprimé.`,
			);
		} catch (error) {
			const history =
				!confirmed &&
				kind === "delete" &&
				error instanceof Error &&
				error.message === historyRefusal;
			setIssues((current) => ({
				...current,
				[player.id]: history
					? {
							history: true,
							message:
								"Ce joueur possède un historique de matchs à conserver. Marquez-le absent pour les prochaines rotations.",
						}
					: {
							history: issues[player.id]?.history,
							needsRefresh: true,
							message: confirmed
								? "Modification confirmée, mais la liste n'a pas pu être actualisée. Actualisez avant une nouvelle action sur ce joueur."
								: kind === "presence"
									? "Présence non confirmée. Le dernier état connu reste affiché. Actualisez avant de réessayer."
									: "Suppression non confirmée. Actualisez avant de réessayer. La suppression est refusée lorsqu'un historique existe.",
						},
			}));
		} finally {
			end();
		}
	}
	return (
		<div className="space-y-6">
			<PlayersHeader
				data={data}
				busy={busy}
				refreshing={pending === "refresh" || fetching}
				onRefresh={refresh}
			/>
			{notice && (
				<output className="block rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
					{notice}
				</output>
			)}
			{refreshError && (
				<p
					role="alert"
					className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				>
					{refreshError}
				</p>
			)}
			<PlayersCounts data={data} />
			<AddPlayerForm
				disabled={busy || addBlocked}
				adding={pending === "add"}
				error={addError}
				onAdd={add}
			/>
			<section
				aria-labelledby="players-list-title"
				className="overflow-hidden rounded-xl border bg-card shadow-sm"
			>
				<div className="space-y-4 border-b p-4 sm:p-5">
					<h2
						ref={heading}
						tabIndex={-1}
						id="players-list-title"
						className="text-xl font-bold focus-visible:outline-2 focus-visible:outline-ring"
					>
						Liste des joueurs
					</h2>
					<p className="text-xs text-muted-foreground">
						Les participations attribuées incluent les matchs prévus, même sans
						résultat. Un joueur absent conserve son historique. Seuls les
						joueurs sans historique de match peuvent être supprimés.
					</p>
					{data.players.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="players-search">
								<Search className="size-4" aria-hidden="true" />
								Rechercher un joueur
							</Label>
							<Input
								id="players-search"
								type="search"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Prénom ou nom"
								className="scroll-mb-24 min-h-11 bg-background text-base md:text-base"
							/>
						</div>
					)}
					{data.players.length > 0 && present === 0 && (
						<p className="rounded-lg bg-muted p-3 text-sm">
							Aucun joueur présent. Marquez les participants présents avant de
							lancer une rotation.
						</p>
					)}
				</div>
				{data.players.length === 0 ? (
					<p className="p-5 text-sm text-muted-foreground">
						Aucun joueur inscrit pour le moment. Ajoute les premiers
						participants pour préparer le tournoi.
					</p>
				) : visible.length === 0 ? (
					<p className="p-5 text-sm text-muted-foreground">
						Aucun joueur ne correspond à cette recherche.
					</p>
				) : (
					<ul className="divide-y">
						{visible.map((player) => (
							<PlayerRow
								key={player.id}
								player={player}
								disabled={busy}
								pending={
									pending === `presence:${player.id}`
										? "presence"
										: pending === `delete:${player.id}`
											? "delete"
											: null
								}
								issue={issues[player.id]}
								onPresence={() => mutate(player, "presence")}
								onRemove={() => mutate(player, "delete")}
								onRemovedFocus={() =>
									heading.current?.focus({ preventScroll: true })
								}
							/>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
