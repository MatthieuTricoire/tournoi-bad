import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { playersQuery } from "#/components/players/players-data";
import { PlayersManager } from "#/components/players/players-manager";
import { Button } from "#/components/ui/button";
import {
	createPlayer,
	deletePlayer,
	togglePlayerPresence,
} from "#/server/functions/players";

export const Route = createFileRoute("/_app/joueurs")({
	head: () => ({ meta: [{ title: "Joueurs · Tournoi de badminton" }] }),
	loader: ({ context }) =>
		context.queryClient.fetchQuery({ ...playersQuery(), staleTime: 0 }),
	pendingComponent: () => (
		<output className="rounded-xl border bg-card p-6">
			Chargement des joueurs…
		</output>
	),
	errorComponent: PlayersLoadError,
	component: PlayersPage,
});

function PlayersPage() {
	const initialData = Route.useLoaderData();
	const { queryClient } = Route.useRouteContext();
	const query = useQuery({ ...playersQuery(), initialData }, queryClient);
	return (
		<PlayersManager
			data={query.data}
			fetching={query.isFetching}
			actions={{
				refresh: () => query.refetch({ throwOnError: true }),
				add: (values) => createPlayer({ data: values }),
				presence: (playerId, isPresent) =>
					togglePlayerPresence({ data: { playerId, isPresent } }),
				remove: (playerId) => deletePlayer({ data: { playerId } }),
			}}
		/>
	);
}

function PlayersLoadError() {
	const router = useRouter();
	const [retrying, setRetrying] = useState(false);
	return (
		<section className="space-y-4 rounded-xl border bg-card p-6">
			<h1 className="text-2xl font-bold">Joueurs indisponibles</h1>
			<p role="alert">
				La liste n'a pas pu être chargée. Vérifiez votre connexion puis
				réessayez.
			</p>
			<Button
				type="button"
				disabled={retrying}
				className="min-h-11"
				onClick={async () => {
					setRetrying(true);
					try {
						await router.invalidate();
					} finally {
						setRetrying(false);
					}
				}}
			>
				{retrying ? "Chargement…" : "Réessayer"}
			</Button>
		</section>
	);
}
