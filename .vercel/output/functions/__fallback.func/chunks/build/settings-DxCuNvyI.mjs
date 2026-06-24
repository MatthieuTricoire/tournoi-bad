import { B as __toESM, C as require_react, N as useRouter, S as require_jsx_runtime } from "./server.mjs";
import { o as resetTournament, u as updateTournamentSettings } from "./tournaments-LAe8ISA6.mjs";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, r as DialogDescription, t as Dialog } from "./dialog-BNtm2oCk.mjs";
import { t as Route } from "./settings-CTZfbOIy.mjs";
//#region .nitro/vite/services/ssr/assets/settings-DxCuNvyI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminSettingsComponent() {
	const { roundData } = Route.useLoaderData();
	const router = useRouter();
	const [roundType, setRoundType] = (0, import_react.useState)(roundData.roundType || "infinite");
	const [maxRounds, setMaxRounds] = (0, import_react.useState)(String(roundData.maxRounds || 4));
	const [maximizeParity, setMaximizeParity] = (0, import_react.useState)(!!roundData.maximizeParity);
	const [availableCourts, setAvailableCourts] = (0, import_react.useState)(String(roundData.availableCourts || 4));
	const [isSaving, setIsSaving] = (0, import_react.useState)(false);
	const [showSavedDialog, setShowSavedDialog] = (0, import_react.useState)(false);
	const [showResetDialog, setShowResetDialog] = (0, import_react.useState)(false);
	async function handleSaveSettings(e) {
		e.preventDefault();
		setIsSaving(true);
		try {
			await updateTournamentSettings({ data: {
				roundType,
				maxRounds: parseInt(maxRounds) || 0,
				maximizeParity,
				availableCourts: parseInt(availableCourts) || 4
			} });
			router.invalidate();
			setShowSavedDialog(true);
		} catch (err) {
			console.error(err);
		} finally {
			setIsSaving(false);
		}
	}
	async function handleReset() {
		if (confirm("⚠️ ATTENTION : Tu vas supprimer TOUS les matchs en cours et remettre les scores à zéro. Les joueurs resteront inscrits. Continuer ?")) {
			await resetTournament();
			router.invalidate();
			setShowResetDialog(true);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container max-w-4xl mx-auto p-4 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex gap-1 sm:gap-2 overflow-x-auto -mx-4 px-4 pb-1",
				children: [
					{
						to: "/admin",
						label: "Tableau de bord"
					},
					{
						to: "/admin/players",
						label: "Joueurs"
					},
					{
						to: "/admin/settings",
						label: "Réglages"
					},
					{
						to: "/admin/ranking",
						label: "Classement"
					}
				].map((link) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => router.navigate({ to: link.to }),
					className: "whitespace-nowrap rounded-md text-sm font-medium px-3 py-1.5 border border-input bg-background hover:bg-muted transition-colors",
					children: link.label
				}, link.to))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-bold tracking-tight",
				children: "Réglages du Tournoi"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground",
				children: "Configure les règles logistiques et le format de jeu."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleSaveSettings,
				className: "rounded-xl border bg-card p-6 shadow-sm space-y-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-sm font-medium leading-none",
							children: "Nombre de terrains disponibles"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: "1",
							max: "12",
							value: availableCourts,
							onChange: (e) => setAvailableCourts(e.target.value),
							className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-lg border p-4 bg-muted/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-sm font-medium",
								children: "Maximiser la parité (Double Mixte)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Force l'algorithme à composer des équipes (M) & (F) autant que possible."
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setMaximizeParity(!maximizeParity),
							className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${maximizeParity ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-800"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${maximizeParity ? "translate-x-5" : "translate-x-1"}` })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-sm font-medium",
							children: "Fin du tournoi"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-3 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setRoundType("infinite"),
									className: `p-3 text-left border rounded-xl text-sm font-medium transition-all ${roundType === "infinite" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted"}`,
									children: ["♾️ Mode libre (Infini)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs font-normal text-muted-foreground mt-1",
										children: "L'admin arrête manuellement quand il veut."
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setRoundType("fixed"),
									className: `p-3 text-left border rounded-xl text-sm font-medium transition-all ${roundType === "fixed" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted"}`,
									children: ["⏱️ Nombre de rounds fixe", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs font-normal text-muted-foreground mt-1",
										children: "Le tournoi se bloque automatiquement au palier défini."
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setRoundType("roundrobin"),
									className: `p-3 text-left border rounded-xl text-sm font-medium transition-all ${roundType === "roundrobin" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted"}`,
									children: ["👥 Round-Robin (Tout le monde)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs font-normal text-muted-foreground mt-1",
										children: "Chaque joueur joue avec tout le monde. Arrêt automatique quand toutes les paires sont formées."
									})]
								})
							]
						})]
					}),
					roundType === "fixed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 pt-2 border-t animate-in fade-in duration-200",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-sm font-medium",
							children: "Nombre maximum de rotations (Rounds)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: "1",
							value: maxRounds,
							onChange: (e) => setMaxRounds(e.target.value),
							className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: isSaving,
						className: "w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2",
						children: isSaving ? "Enregistrement..." : "💾 Sauvegarder les configurations"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/10 p-6 space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-bold text-red-800 dark:text-red-400 text-lg",
					children: "Zone de danger"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-red-600/80 dark:text-red-400/60",
					children: "Actions destructrices irréversibles."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-red-100 dark:border-red-900/50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground max-w-sm",
						children: "Efface tous les matchs, les scores du tableau en cours et remet le classement général à zéro. Conserve uniquement les profils des joueurs."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: handleReset,
						className: "inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 text-xs font-semibold text-white shadow hover:bg-red-500 shrink-0",
						children: "💥 Réinitialiser le tournoi"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: showSavedDialog,
				onOpenChange: setShowSavedDialog,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "⚙️ Réglages enregistrés" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Les configurations ont été sauvegardées avec succès." })] }) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: showResetDialog,
				onOpenChange: setShowResetDialog,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "🔄 Tournoi réinitialisé" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Le tournoi a été remis au Round 0. Tous les matchs et scores ont été effacés." })] }) })
			})
		]
	});
}
//#endregion
export { AdminSettingsComponent as component };
