import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	createPlayer,
	getPlayers,
	togglePlayerPresence,
	deletePlayer,
} from "#/server/functions/players";

// 1. Le Loader : C'est l'un des gros points forts de TanStack Start.
// Il va chercher les données sur le serveur AVANT que la page ne s'affiche.
export const Route = createFileRoute("/admin/players")({
	loader: async () => {
		// 2. On appelle la Server Function. TanStack Start va faire une requête HTTP
		// magique en coulisses vers le serveur, sans envoyer le code de la DB au navigateur.
		const allPlayers = await getPlayers();
		return { allPlayers };
	},
	component: AdminPlayersComponent,
});

function AdminPlayersComponent() {
	// On récupère les données chargées par le loader ci-dessus
	const { allPlayers } = Route.useLoaderData();
	const router = useRouter();

	// États locaux pour gérer le formulaire d'ajout
	const [firstname, setFirstname] = useState("");
	const [lastname, setLastname] = useState("");
	const [gender, setGender] = useState<"M" | "F">("M");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Fonction appelée lors de la soumission du formulaire d'ajout
	async function handleAddPlayer(e: React.FormEvent) {
		e.preventDefault();
		if (!firstname) return;

		setIsSubmitting(true);
		try {
			await createPlayer({ data: { firstname, lastname, gender } });

			// On vide les champs
			setFirstname("");
			setLastname("");

			// Magie TanStack : On dit au routeur de recharger le loader pour afficher le nouveau joueur
			router.invalidate();
		} catch (error) {
			console.error("Erreur lors de l'ajout du joueur", error);
		} finally {
			setIsSubmitting(false);
		}
	}

	// Fonction appelée quand on coche/décoche le bouton de présence
	async function handleTogglePresence(
		playerId: number,
		currentPresence: boolean,
	) {
		try {
			await togglePlayerPresence({
				data: { playerId, isPresent: !currentPresence },
			});
			// On rafraîchit les données de la page instantanément
			router.invalidate();
		} catch (error) {
			console.error("Erreur de modification de présence", error);
		}
	}

	async function handleDeletePlayer(playerId: number, name: string) {
		if (!confirm(`Supprimer ${name} définitivement ?`)) return;
		try {
			await deletePlayer({ data: { playerId } });
			router.invalidate();
		} catch (error) {
			console.error("Erreur lors de la suppression", error);
		}
	}

	// Calcul rapide du nombre de joueurs prêts
	const presentCount = allPlayers.filter((p) => p.present).length;

	return (
		<div className="container max-w-4xl mx-auto p-4 space-y-6">
			<nav className="flex gap-1 sm:gap-2 overflow-x-auto -mx-4 px-4 pb-1">
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
			{/* En-tête */}
			<div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Gestion des Joueurs
					</h1>
					<p className="text-muted-foreground">
						Inscris les membres et coche les présents pour le tournoi.
					</p>
				</div>
				<div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold text-sm self-start">
					🏃‍♂️ {presentCount} joueurs présents / {allPlayers.length} inscrits
				</div>
			</div>

			{/* Formu d'ajout (Style Card shadcn fait maison avec Tailwind) */}
			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<h2 className="font-semibold text-xl mb-4">Ajouter un joueur</h2>
				<form
					onSubmit={handleAddPlayer}
					className="flex flex-col sm:flex-row gap-4 items-start sm:items-end"
				>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground">Prénom *</label>
						<input
							type="text"
							placeholder="Prénom"
							value={firstname}
							onChange={(e) => setFirstname(e.target.value)}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs"
							required
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground">Nom (optionnel)</label>
						<input
							type="text"
							placeholder="Nom"
							value={lastname}
							onChange={(e) => setLastname(e.target.value)}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs"
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground">Genre</label>
						<div className="flex h-10 rounded-md border border-input bg-background overflow-hidden">
							<button
								type="button"
								onClick={() => setGender("M")}
								className={`px-4 text-sm font-medium transition-colors ${gender === "M" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
							>
								H
							</button>
							<button
								type="button"
								onClick={() => setGender("F")}
								className={`px-4 text-sm font-medium transition-colors ${gender === "F" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
							>
								F
							</button>
						</div>
					</div>
					<button
						type="submit"
						disabled={isSubmitting}
						className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
					>
						{isSubmitting ? "Ajout..." : "➕ Ajouter"}
					</button>
				</form>
			</div>

			{/* Tableau des joueurs */}
			<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
				<table className="w-full caption-bottom text-sm">
					<thead className="bg-muted/50 border-b">
						<tr className="transition-colors">
							<th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
								Joueur
							</th>
							<th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground w-32">
								Matchs Joués
							</th>
							<th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-32">
								Présence
							</th>
							<th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground w-16">
							</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{allPlayers.length === 0 ? (
							<tr>
								<td
									colSpan={4}
									className="h-24 text-center text-muted-foreground"
								>
									Aucun joueur inscrit pour le moment.
								</td>
							</tr>
						) : (
							allPlayers.map((player) => (
								<tr
									key={player.id}
									className="hover:bg-muted/50 transition-colors"
								>
									<td className="p-4 align-middle font-medium capitalize">
										{player.firstname} {player.lastname}
									</td>
									<td className="p-4 align-middle text-center font-mono">
										{player.playedGames}
									</td>
							<td className="p-4 align-middle text-right">
										{/* Switch shadcn fait maison avec Tailwind */}
										<button
											type="button"
											onClick={() =>
												handleTogglePresence(player.id, player.present)
											}
											className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-input ${
												player.present
													? "bg-green-500"
													: "bg-zinc-200 dark:bg-zinc-800"
											}`}
										>
											<span
												className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
													player.present ? "translate-x-5" : "translate-x-1"
												}`}
											/>
										</button>
									</td>
									<td className="p-4 align-middle text-center">
										<button
											type="button"
											onClick={() =>
												handleDeletePlayer(
													player.id,
													`${player.firstname} ${player.lastname}`,
												)
											}
											className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
										>
											🗑️
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
