import { B as __toESM, C as require_react, N as useRouter, S as require_jsx_runtime } from "./server.mjs";
import { c as submitMatchScore, s as startNextRound, t as finishTournament } from "./tournaments-LAe8ISA6.mjs";
import { t as Route } from "./admin-D9k3pSeg.mjs";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, r as DialogDescription, t as Dialog } from "./dialog-BNtm2oCk.mjs";
//#region .nitro/vite/services/ssr/assets/admin-BAil4Bow.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminDashboardComponent() {
	const { roundData, scheduleData } = Route.useLoaderData({});
	const router = useRouter();
	const [showSchedule, setShowSchedule] = (0, import_react.useState)(false);
	const [selectedMatchId, setSelectedMatchId] = (0, import_react.useState)(null);
	const [score1, setScore1] = (0, import_react.useState)("");
	const [score2, setScore2] = (0, import_react.useState)("");
	const [errorDialog, setErrorDialog] = (0, import_react.useState)({
		open: false,
		message: ""
	});
	const [showConfirmRound, setShowConfirmRound] = (0, import_react.useState)(false);
	const [showConfirmFinish, setShowConfirmFinish] = (0, import_react.useState)(false);
	const [isFinishing, setIsFinishing] = (0, import_react.useState)(false);
	async function handleFinishTournament() {
		setIsFinishing(true);
		try {
			await finishTournament();
			router.invalidate();
		} finally {
			setIsFinishing(false);
		}
	}
	async function handleNextRound() {
		try {
			await startNextRound();
			router.invalidate();
		} catch (e) {
			setErrorDialog({
				open: true,
				message: e instanceof Error ? e.message : "Une erreur est survenue"
			});
		}
	}
	async function handleSaveScore(e) {
		e.preventDefault();
		if (selectedMatchId === null || !score1 || !score2) return;
		await submitMatchScore({ data: {
			matchId: selectedMatchId,
			scoreTeam1: parseInt(score1),
			scoreTeam2: parseInt(score2)
		} });
		setSelectedMatchId(null);
		setScore1("");
		setScore2("");
		router.invalidate();
	}
	const allMatchsFinished = roundData.matches.length > 0 && roundData.matches.every((m) => m.status === "finished");
	const isLastRound = roundData.status === "finished" || roundData.roundType === "fixed" && roundData.maxRounds > 0 && roundData.currentRound >= roundData.maxRounds || roundData.roundType === "roundrobin" && roundData.roundRobinProgress && roundData.roundRobinProgress.completedPairs >= roundData.roundRobinProgress.totalPairs;
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl font-bold tracking-tight",
					children: "Tableau de Bord"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Pilote les terrains et enregistre les résultats en direct."
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2 text-xs text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md border",
						children: [
							"🏸 ",
							roundData.availableCourts,
							" Terrains ouverts"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${roundData.maximizeParity ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : "bg-muted"}`,
						children: roundData.maximizeParity ? "👫 Parité : Activée (Double mixte)" : "🎲 Parité : Désactivée (Mixte libre)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md border",
						children: roundData.roundType === "fixed" ? `⏱️ Format : ${roundData.maxRounds} Rounds max` : roundData.roundType === "roundrobin" ? "👥 Format : Round-Robin (Tout le monde)" : "♾️ Format : Libre (Jusqu'à épuisement)"
					}),
					roundData.roundType === "roundrobin" && roundData.roundRobinProgress && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 px-2.5 py-1 rounded-md border",
						children: [
							"📊 ",
							roundData.roundRobinProgress.completedPairs,
							"/",
							roundData.roundRobinProgress.totalPairs,
							" paires complétées — ",
							scheduleData.rounds.length,
							" rounds restants"
						]
					}),
					roundData.roundType === "fixed" && scheduleData.rounds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 px-2.5 py-1 rounded-md border",
						children: [
							"📊 ",
							scheduleData.rounds.length,
							" rounds restants"
						]
					})
				]
			}),
			" ",
			roundData.currentRound === 0 || roundData.matches.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-dashed p-12 text-center bg-card shadow-sm space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-xl font-semibold",
						children: "Le tournoi n'a pas encore commencé"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground max-w-sm mx-auto",
						children: "Une fois vos joueurs inscrits et marqués comme présents, cliquez sur le bouton ci-dessous pour générer le Round 1."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setShowConfirmRound(true),
						className: "inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2",
						children: "🚀 Lancer le Premier Round"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [
					roundData.roundType === "roundrobin" && roundData.roundRobinProgress && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium text-blue-700 dark:text-blue-400",
								children: "👥 Progression des paires"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted-foreground",
								children: [
									roundData.roundRobinProgress.completedPairs,
									"/",
									roundData.roundRobinProgress.totalPairs,
									" complétées — ",
									scheduleData.rounds.length,
									" rounds restants"
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-full bg-muted rounded-full h-3 overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bg-blue-500 h-full rounded-full transition-all duration-500",
								style: { width: `${Math.round(roundData.roundRobinProgress.progress * 100)}%` }
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-primary/5 border border-primary/20 p-4 rounded-xl",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-lg font-bold text-primary",
							children: ["🔄 Rotation en cours : Round ", roundData.currentRound]
						}), isLastRound && allMatchsFinished ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => router.navigate({ to: "/admin/ranking" }),
							className: "inline-flex items-center justify-center rounded-md text-sm font-medium bg-yellow-500 text-white hover:bg-yellow-400 h-10 px-4 py-2",
							children: "🏆 Voir le classement"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowConfirmRound(true),
								disabled: !allMatchsFinished,
								className: `inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 ${allMatchsFinished ? "bg-green-600 text-white hover:bg-green-500" : "bg-muted text-muted-foreground cursor-not-allowed"}`,
								children: allMatchsFinished ? "⏭️ Passer au Round Suivant" : "⏳ En attente des scores"
							}), (roundData.roundType === "infinite" || roundData.roundType === "roundrobin") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowConfirmFinish(true),
								disabled: !allMatchsFinished,
								className: `inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 ${allMatchsFinished ? "bg-red-600 text-white hover:bg-red-500" : "bg-muted text-muted-foreground cursor-not-allowed"}`,
								children: "🏁 Terminer le tournoi"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 md:grid-cols-2 gap-4",
						children: roundData.matches.map((match) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden ${match.status === "finished" ? "opacity-60 bg-muted/20" : ""}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-muted/50 px-4 py-3 border-b flex justify-between items-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-bold text-sm tracking-wide uppercase",
									children: ["🏸 Terrain ", match.court]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `text-xs px-2 py-1 rounded-full font-semibold ${match.status === "finished" ? "bg-zinc-200 text-zinc-700" : "bg-amber-100 text-amber-800 animate-pulse"}`,
									children: match.status === "finished" ? "Terminé" : "En cours"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1 w-5/12",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-sm font-semibold truncate capitalize",
												children: [
													match.team1[0]?.firstname,
													" ",
													match.team1[0]?.lastname
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-sm font-semibold truncate capitalize",
												children: [
													match.team1[1]?.firstname,
													" ",
													match.team1[1]?.lastname
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-center font-bold text-muted-foreground text-xs px-2",
											children: "VS"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1 w-5/12 text-right",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-sm font-semibold truncate capitalize",
												children: [
													match.team2[0]?.firstname,
													" ",
													match.team2[0]?.lastname
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-sm font-semibold truncate capitalize",
												children: [
													match.team2[1]?.firstname,
													" ",
													match.team2[1]?.lastname
												]
											})]
										})
									]
								}), match.status === "finished" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "bg-muted p-2 rounded-lg text-center font-mono font-bold text-lg text-primary",
									children: [
										"Score final : ",
										match.team1[0]?.teamScore,
										" -",
										" ",
										match.team2[0]?.teamScore
									]
								}) : selectedMatchId === match.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: handleSaveScore,
									className: "flex items-center justify-center gap-2 pt-2 border-t",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											placeholder: "T1",
											value: score1,
											onChange: (e) => setScore1(e.target.value),
											className: "w-16 h-9 rounded-md border border-input text-center font-mono",
											required: true,
											min: "0"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold",
											children: "-"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											placeholder: "T2",
											value: score2,
											onChange: (e) => setScore2(e.target.value),
											className: "w-16 h-9 rounded-md border border-input text-center font-mono",
											required: true,
											min: "0"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "submit",
											className: "h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium",
											children: "💾 OK"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setSelectedMatchId(null),
											className: "h-9 px-2 rounded-md border border-input text-xs",
											children: "❌"
										})
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setSelectedMatchId(match.id),
									className: "w-full inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted h-9 text-xs font-semibold",
									children: "📝 Entrer le score"
								})]
							})]
						}, match.id))
					}),
					roundData.restingPlayers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border bg-card p-4 shadow-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2",
							children: "🍹 Au repos / À la buvette (Prioritaires au prochain round)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: roundData.restingPlayers.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-sm font-medium capitalize text-zinc-800 dark:text-zinc-200 border",
								children: [
									"😴 ",
									p.firstname,
									" ",
									p.lastname
								]
							}, p.id))
						})]
					}),
					roundData.roundType !== "infinite" && scheduleData.rounds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border bg-card shadow-sm overflow-hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setShowSchedule(!showSchedule),
							className: "w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-semibold text-sm",
								children: [
									"📋 Planning des rounds à venir (",
									scheduleData.rounds.length,
									" rounds)",
									roundData.roundType === "fixed" && roundData.maxRounds > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-normal text-muted-foreground",
										children: [
											" ",
											"— Round ",
											roundData.currentRound,
											"/",
											roundData.maxRounds
										]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: showSchedule ? "▲" : "▼"
							})]
						}), showSchedule && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "divide-y",
							children: scheduleData.rounds.map((round) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm font-semibold text-primary",
									children: [
										"Round ",
										round.roundNumber,
										" — ",
										round.teams.length,
										" équipes"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1",
									children: round.teams.map((team, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 text-sm bg-muted/30 px-3 py-1.5 rounded-md",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground",
												children: "👥"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "capitalize font-medium",
												children: [
													team.player1.firstname,
													" ",
													team.player1.lastname
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground",
												children: "&"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "capitalize font-medium",
												children: [
													team.player2.firstname,
													" ",
													team.player2.lastname
												]
											})
										]
									}, i))
								})]
							}, round.roundNumber))
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: showConfirmRound,
				onOpenChange: setShowConfirmRound,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Lancer la prochaine rotation ?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Es-tu sûr de vouloir générer le prochain round\xA0?" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setShowConfirmRound(false),
						className: "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-muted h-9 px-4 py-2",
						children: "Annuler"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setShowConfirmRound(false);
							handleNextRound();
						},
						className: "inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2",
						children: "Confirmer"
					})]
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: showConfirmFinish,
				onOpenChange: setShowConfirmFinish,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Terminer le tournoi ?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Es-tu sûr de vouloir arrêter le tournoi\xA0? Les matchs en cours seront conservés et le classement sera figé." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setShowConfirmFinish(false),
						className: "inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-muted h-9 px-4 py-2",
						children: "Annuler"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: isFinishing,
						onClick: () => {
							setShowConfirmFinish(false);
							handleFinishTournament();
						},
						className: "inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-500 h-9 px-4 py-2 disabled:opacity-50",
						children: isFinishing ? "Arrêt..." : "Oui, terminer"
					})]
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: errorDialog.open,
				onOpenChange: (open) => setErrorDialog({
					...errorDialog,
					open
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Erreur" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: errorDialog.message })] }) })
			})
		]
	});
}
//#endregion
export { AdminDashboardComponent as component };
