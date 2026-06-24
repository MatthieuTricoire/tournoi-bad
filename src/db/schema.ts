import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	lastname: text("lastname").notNull().default(""),
	firstname: text("firstname").notNull(),
	totalScore: integer("total_score").notNull().default(0),
	playedGames: integer("played_games").notNull().default(0),
	present: integer("present", { mode: "boolean" }).default(true).notNull(),
	gender: text("gender", { enum: ["M", "F"] })
		.notNull()
		.default("M"),
});

export const matches = sqliteTable("matches", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	roundNumber: integer("round_number").notNull(),
	court: integer("court").notNull(), // Numéro du terrain de 1 à 4
	status: text("status", { enum: ["waiting", "finished"] })
		.default("waiting")
		.notNull(),
	createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const matchParticipants = sqliteTable("match_players", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	matchId: integer("match_id")
		.notNull()
		.references(() => matches.id, { onDelete: "cascade" }),
	playerId: integer("player_id")
		.notNull()
		.references(() => players.id, { onDelete: "cascade" }),
	team: integer("team").notNull(), // 1 or 2 (Pair 1 or Pair 2)
	teamScore: integer("team_score").notNull().default(0), // The score achieved by this player's team in this match
});

export const tournamentSettings = sqliteTable("tournament_settings", {
	id: integer("id").primaryKey().default(1), // Fixé à 1 pour n'avoir qu'une seule config
	availableCourts: integer("available_courts").notNull().default(4), // Modifiable par l'admin
	currentRound: integer("current_round").notNull().default(0),
	status: text("status", { enum: ["active", "finished"] })
		.default("active")
		.notNull(), // Statut global du tournoi
	roundType: text("round_type", {
			enum: ["infinite", "fixed", "roundrobin"],
		})
		.notNull()
		.default("infinite"),
	maxRounds: integer("max_rounds").default(0),
	maximizeParity: integer("maximize_parity", { mode: "boolean" })
		.notNull()
		.default(false),
});
