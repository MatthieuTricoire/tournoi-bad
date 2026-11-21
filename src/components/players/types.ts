import type { getPlayers } from "#/server/functions/players";

export type Player = Awaited<ReturnType<typeof getPlayers>>[number];
export type PlayersData = { players: Player[]; loadedAt: number };
export type NewPlayer = {
	firstname: string;
	lastname: string;
	gender: "M" | "F";
};
export type PlayersActions = {
	refresh: () => Promise<unknown>;
	add: (values: NewPlayer) => Promise<unknown>;
	presence: (id: number, present: boolean) => Promise<unknown>;
	remove: (id: number) => Promise<unknown>;
};

// Same limits as playerSchema in server/functions/players.ts. No trimming,
// uniqueness rule or additional restriction: the server remains authoritative.
export function validatePlayer(values: NewPlayer) {
	return {
		firstname:
			values.firstname.length < 2
				? "Le prénom doit contenir au moins 2 caractères."
				: values.firstname.length > 50
					? "Le prénom doit contenir au maximum 50 caractères."
					: "",
		lastname:
			values.lastname.length > 50
				? "Le nom doit contenir au maximum 50 caractères."
				: "",
	};
}
