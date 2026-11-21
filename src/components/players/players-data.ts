import { queryOptions } from "@tanstack/react-query";
import { getPlayers } from "#/server/functions/players";
import type { PlayersData } from "./types";

export async function loadPlayers(): Promise<PlayersData> {
	const players = await getPlayers();
	return { players, loadedAt: Date.now() };
}

export const playersQuery = () =>
	queryOptions({
		queryKey: ["players-management"],
		queryFn: loadPlayers,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
