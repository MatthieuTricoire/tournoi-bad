import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	dashboardQuery,
	saveDashboardScore,
} from "#/components/tournament/dashboard-data";
import { TournamentDashboard } from "#/components/tournament/tournament-dashboard";
import { Button } from "#/components/ui/button";
import {
	finishTournament,
	startNextRound,
} from "#/server/functions/tournaments";

export const Route = createFileRoute("/_app/")({
	head: () => ({ meta: [{ title: "Tournoi · Tournoi de badminton" }] }),
	loader: ({ context }) =>
		context.queryClient.fetchQuery({ ...dashboardQuery(), staleTime: 0 }),
	pendingComponent: () => (
		<output className="rounded-xl border bg-card p-6">
			Chargement du tournoi…
		</output>
	),
	errorComponent: DashboardLoadError,
	component: DashboardPage,
});

function DashboardPage() {
	const initialData = Route.useLoaderData();
	const { queryClient } = Route.useRouteContext();
	const query = useQuery({ ...dashboardQuery(), initialData }, queryClient);
	return (
		<TournamentDashboard
			data={query.data}
			fetching={query.isFetching}
			actions={{
				refresh: () => query.refetch({ throwOnError: true }),
				generate: () => startNextRound(),
				finish: () => finishTournament(),
				saveScore: saveDashboardScore,
			}}
		/>
	);
}

function DashboardLoadError() {
	const router = useRouter();
	const [retrying, setRetrying] = useState(false);
	return (
		<section className="space-y-4 rounded-xl border bg-card p-6">
			<h1 className="text-2xl font-bold">Tournoi indisponible</h1>
			<p role="alert">
				Les données n'ont pas pu être chargées. Vérifiez votre connexion puis
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
