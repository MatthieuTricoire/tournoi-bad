import { B as __toESM, C as require_react, N as useRouter, S as require_jsx_runtime } from "./server.mjs";
import { i as togglePlayerPresence, n as createPlayer, r as deletePlayer, t as Route } from "./players-BV_JB3GU.mjs";
//#region .nitro/vite/services/ssr/assets/players-DMQJEHh-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminPlayersComponent() {
	const { allPlayers } = Route.useLoaderData();
	const router = useRouter();
	const [firstname, setFirstname] = (0, import_react.useState)("");
	const [lastname, setLastname] = (0, import_react.useState)("");
	const [gender, setGender] = (0, import_react.useState)("M");
	const [isSubmitting, setIsSubmitting] = (0, import_react.useState)(false);
	async function handleAddPlayer(e) {
		e.preventDefault();
		if (!firstname) return;
		setIsSubmitting(true);
		try {
			await createPlayer({ data: {
				firstname,
				lastname,
				gender
			} });
			setFirstname("");
			setLastname("");
			router.invalidate();
		} catch (error) {
			console.error("Erreur lors de l'ajout du joueur", error);
		} finally {
			setIsSubmitting(false);
		}
	}
	async function handleTogglePresence(playerId, currentPresence) {
		try {
			await togglePlayerPresence({ data: {
				playerId,
				isPresent: !currentPresence
			} });
			router.invalidate();
		} catch (error) {
			console.error("Erreur de modification de présence", error);
		}
	}
	async function handleDeletePlayer(playerId, name) {
		if (!confirm(`Supprimer ${name} définitivement ?`)) return;
		try {
			await deletePlayer({ data: { playerId } });
			router.invalidate();
		} catch (error) {
			console.error("Erreur lors de la suppression", error);
		}
	}
	const presentCount = allPlayers.filter((p) => p.present).length;
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl font-bold tracking-tight",
					children: "Gestion des Joueurs"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Inscris les membres et coche les présents pour le tournoi."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold text-sm self-start",
					children: [
						"🏃‍♂️ ",
						presentCount,
						" joueurs présents / ",
						allPlayers.length,
						" inscrits"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border bg-card p-6 shadow-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-semibold text-xl mb-4",
					children: "Ajouter un joueur"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleAddPlayer,
					className: "flex flex-col sm:flex-row gap-4 items-start sm:items-end",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-medium text-muted-foreground",
								children: "Prénom *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								placeholder: "Prénom",
								value: firstname,
								onChange: (e) => setFirstname(e.target.value),
								className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs",
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-medium text-muted-foreground",
								children: "Nom (optionnel)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								placeholder: "Nom",
								value: lastname,
								onChange: (e) => setLastname(e.target.value),
								className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-medium text-muted-foreground",
								children: "Genre"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex h-10 rounded-md border border-input bg-background overflow-hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setGender("M"),
									className: `px-4 text-sm font-medium transition-colors ${gender === "M" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`,
									children: "H"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setGender("F"),
									className: `px-4 text-sm font-medium transition-colors ${gender === "F" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`,
									children: "F"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: isSubmitting,
							className: "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50",
							children: isSubmitting ? "Ajout..." : "➕ Ajouter"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-xl border bg-card shadow-sm overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full caption-bottom text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-muted/50 border-b",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "transition-colors",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
									children: "Joueur"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "h-12 px-4 text-center align-middle font-medium text-muted-foreground w-32",
									children: "Matchs Joués"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "h-12 px-4 text-right align-middle font-medium text-muted-foreground w-32",
									children: "Présence"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "h-12 px-4 text-center align-middle font-medium text-muted-foreground w-16" })
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
						className: "divide-y",
						children: allPlayers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							colSpan: 4,
							className: "h-24 text-center text-muted-foreground",
							children: "Aucun joueur inscrit pour le moment."
						}) }) : allPlayers.map((player) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "hover:bg-muted/50 transition-colors",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "p-4 align-middle font-medium capitalize",
									children: [
										player.firstname,
										" ",
										player.lastname
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-4 align-middle text-center font-mono",
									children: player.playedGames
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-4 align-middle text-right",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => handleTogglePresence(player.id, player.present),
										className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-input ${player.present ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-800"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${player.present ? "translate-x-5" : "translate-x-1"}` })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-4 align-middle text-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => handleDeletePlayer(player.id, `${player.firstname} ${player.lastname}`),
										className: "inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors",
										children: "🗑️"
									})
								})
							]
						}, player.id))
					})]
				})
			})
		]
	});
}
//#endregion
export { AdminPlayersComponent as component };
