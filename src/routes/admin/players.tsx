import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/players")({
	beforeLoad: () => {
		throw redirect({ to: "/joueurs", replace: true, statusCode: 308 });
	},
});
