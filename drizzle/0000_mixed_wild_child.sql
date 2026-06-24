CREATE TABLE `match_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`team` integer NOT NULL,
	`team_score` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`round_number` integer NOT NULL,
	`court` integer NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lastname` text DEFAULT '' NOT NULL,
	`firstname` text NOT NULL,
	`total_score` integer DEFAULT 0 NOT NULL,
	`played_games` integer DEFAULT 0 NOT NULL,
	`present` integer DEFAULT true NOT NULL,
	`gender` text DEFAULT 'M' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournament_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`available_courts` integer DEFAULT 4 NOT NULL,
	`current_round` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`round_type` text DEFAULT 'infinite' NOT NULL,
	`max_rounds` integer DEFAULT 0,
	`maximize_parity` integer DEFAULT false NOT NULL
);
