import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "#/db";
import { players } from "#/db/schema";

const playerSchema = z.object({
	firstname: z
		.string()
		.min(2, "Le prénom est trop court")
		.max(50, "Le prénom est trop long"),
	lastname: z
		.string()
		.max(50, "Le nom est trop long")
		.optional()
		.default(""),
	gender: z.enum(["M", "F"]).optional().default("M"),
});

export const createPlayer = createServerFn({ method: "POST" })
	.inputValidator(playerSchema)
	.handler(async ({ data }) => {
		await db.insert(players).values({
			firstname: data.firstname,
			lastname: data.lastname,
			gender: data.gender,
			present: true,
		});

		return { success: true };
	});

export const togglePlayerPresence = createServerFn({
	method: "POST",
})
	.inputValidator(z.object({ playerId: z.number(), isPresent: z.boolean() }))
	.handler(async ({ data }) => {
		await db
			.update(players)
			.set({ present: data.isPresent })
			.where(eq(players.id, data.playerId));

		return { success: true };
	});

export const deletePlayer = createServerFn({ method: "POST" })
	.inputValidator(z.object({ playerId: z.number() }))
	.handler(async ({ data }) => {
		await db.delete(players).where(eq(players.id, data.playerId));
		return { success: true };
	});

export const getPlayers = createServerFn({ method: "GET" }).handler(
	async () => {
		// On fait la requête SQL côté serveur
		const allPlayers = await db
			.select()
			.from(players)
			.orderBy(players.lastname);
		return allPlayers;
	},
);
