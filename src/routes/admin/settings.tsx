import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	getCurrentRoundData,
	resetTournament,
	updateTournamentSettings,
} from "#/server/functions/tournaments";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";

export const Route = createFileRoute("/admin/settings")({
	loader: async () => {
		const roundData = await getCurrentRoundData();
		return { roundData };
	},
	component: AdminSettingsComponent,
});

function AdminSettingsComponent() {
	const { roundData } = Route.useLoaderData();
	const router = useRouter();

	// États locaux initialisés avec les données actuelles de la base
	const [roundType, setRoundType] = useState<"infinite" | "fixed" | "roundrobin">(
		roundData.roundType || "infinite",
	);
	const [maxRounds, setMaxRounds] = useState(String(roundData.maxRounds || 4));
	const [maximizeParity, setMaximizeParity] = useState(
		!!roundData.maximizeParity,
	);
	const [availableCourts, setAvailableCourts] = useState(
		String(roundData.availableCourts || 4),
	);
	const [isSaving, setIsSaving] = useState(false);
	const [showSavedDialog, setShowSavedDialog] = useState(false);
	const [showResetDialog, setShowResetDialog] = useState(false);

	async function handleSaveSettings(e: React.FormEvent) {
		e.preventDefault();
		setIsSaving(true);
		try {
			await updateTournamentSettings({
				data: {
					roundType,
					maxRounds: parseInt(maxRounds) || 0,
					maximizeParity,
					availableCourts: parseInt(availableCourts) || 4,
				},
			});
			router.invalidate();
			setShowSavedDialog(true);
		} catch (err) {
			console.error(err);
		} finally {
			setIsSaving(false);
		}
	}

	async function handleReset() {
		if (
			confirm(
				"⚠️ ATTENTION : Tu vas supprimer TOUS les matchs en cours et remettre les scores à zéro. Les joueurs resteront inscrits. Continuer ?",
			)
		) {
			await resetTournament();
			router.invalidate();
			setShowResetDialog(true);
		}
	}

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
			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					Réglages du Tournoi
				</h1>
				<p className="text-muted-foreground">
					Configure les règles logistiques et le format de jeu.
				</p>
			</div>

			{/* Formulaire principal de configuration */}
			<form
				onSubmit={handleSaveSettings}
				className="rounded-xl border bg-card p-6 shadow-sm space-y-6"
			>
				{/* Nombre de terrains */}
				<div className="space-y-2">
					<label className="text-sm font-medium leading-none">
						Nombre de terrains disponibles
					</label>
					<input
						type="number"
						min="1"
						max="12"
						value={availableCourts}
						onChange={(e) => setAvailableCourts(e.target.value)}
						className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
					/>
				</div>

				{/* Option de parité (Mixité) */}
				<div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
					<div className="space-y-0.5">
						<label className="text-sm font-medium">
							Maximiser la parité (Double Mixte)
						</label>
						<p className="text-xs text-muted-foreground">
							Force l'algorithme à composer des équipes (M) & (F) autant que
							possible.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setMaximizeParity(!maximizeParity)}
						className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
							maximizeParity ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-800"
						}`}
					>
						<span
							className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${maximizeParity ? "translate-x-5" : "translate-x-1"}`}
						/>
					</button>
				</div>

				{/* Type de fin de tournoi */}
				<div className="space-y-3">
					<label className="text-sm font-medium">Fin du tournoi</label>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<button
							type="button"
							onClick={() => setRoundType("infinite")}
							className={`p-3 text-left border rounded-xl text-sm font-medium transition-all ${roundType === "infinite" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted"}`}
						>
							♾️ Mode libre (Infini)
							<span className="block text-xs font-normal text-muted-foreground mt-1">
								L'admin arrête manuellement quand il veut.
							</span>
						</button>
						<button
							type="button"
							onClick={() => setRoundType("fixed")}
							className={`p-3 text-left border rounded-xl text-sm font-medium transition-all ${roundType === "fixed" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted"}`}
						>
							⏱️ Nombre de rounds fixe
							<span className="block text-xs font-normal text-muted-foreground mt-1">
								Le tournoi se bloque automatiquement au palier défini.
							</span>
						</button>
						<button
							type="button"
							onClick={() => setRoundType("roundrobin")}
							className={`p-3 text-left border rounded-xl text-sm font-medium transition-all ${roundType === "roundrobin" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted"}`}
						>
							👥 Round-Robin (Tout le monde)
							<span className="block text-xs font-normal text-muted-foreground mt-1">
								Chaque joueur joue avec tout le monde. Arrêt automatique quand toutes les paires sont formées.
							</span>
						</button>
					</div>
				</div>

				{/* Champ conditionnel pour le nombre de rounds max */}
				{roundType === "fixed" && (
					<div className="space-y-2 pt-2 border-t animate-in fade-in duration-200">
						<label className="text-sm font-medium">
							Nombre maximum de rotations (Rounds)
						</label>
						<input
							type="number"
							min="1"
							value={maxRounds}
							onChange={(e) => setMaxRounds(e.target.value)}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							required
						/>
					</div>
				)}

				<button
					type="submit"
					disabled={isSaving}
					className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
				>
					{isSaving ? "Enregistrement..." : "💾 Sauvegarder les configurations"}
				</button>
			</form>

			{/* Zone de Danger (Réinitialisation) */}
			<div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/10 p-6 space-y-4">
				<div>
					<h2 className="font-bold text-red-800 dark:text-red-400 text-lg">
						Zone de danger
					</h2>
					<p className="text-sm text-red-600/80 dark:text-red-400/60">
						Actions destructrices irréversibles.
					</p>
				</div>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-red-100 dark:border-red-900/50">
					<p className="text-xs text-muted-foreground max-w-sm">
						Efface tous les matchs, les scores du tableau en cours et remet le
						classement général à zéro. Conserve uniquement les profils des
						joueurs.
					</p>
					<button
						type="button"
						onClick={handleReset}
						className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 text-xs font-semibold text-white shadow hover:bg-red-500 shrink-0"
					>
						💥 Réinitialiser le tournoi
					</button>
				</div>
			</div>

			<Dialog open={showSavedDialog} onOpenChange={setShowSavedDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>⚙️ Réglages enregistrés</DialogTitle>
						<DialogDescription>
							Les configurations ont été sauvegardées avec succès.
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>

			<Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>🔄 Tournoi réinitialisé</DialogTitle>
						<DialogDescription>
							Le tournoi a été remis au Round 0. Tous les matchs et scores ont été effacés.
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</div>
	);
}
