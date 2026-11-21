import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	correctRankingScore,
	rankingQuery,
} from "#/components/ranking/ranking-data";
import { RankingPage } from "#/components/ranking/ranking-page";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/_app/classement")({
	head: () => ({ meta: [{ title: "Classement · Tournoi de badminton" }] }),
	loader: ({ context }) =>
		context.queryClient.fetchQuery({ ...rankingQuery(), staleTime: 0 }),
	pendingComponent: () => (
		<output className="rounded-xl border bg-card p-6">
			Chargement du classement…
		</output>
	),
	errorComponent: RankingLoadError,
	component: RankingRoute,
});
function RankingRoute() {
	const initialData = Route.useLoaderData();
	const { queryClient } = Route.useRouteContext();
	const query = useQuery({ ...rankingQuery(), initialData }, queryClient);
	return (
		<RankingPage
			data={query.data}
			fetching={query.isFetching}
			actions={{
				refresh: () => query.refetch({ throwOnError: true }),
				correct: correctRankingScore,
			}}
		/>
	);
}
function RankingLoadError() {
	const router = useRouter();
	const [retrying, setRetrying] = useState(false);
	return (
		<section className="space-y-4 rounded-xl border bg-card p-6">
			<h1 className="text-2xl font-bold">Classement indisponible</h1>
			<p role="alert">
				Les résultats n'ont pas pu être chargés. Vérifiez votre connexion puis
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
