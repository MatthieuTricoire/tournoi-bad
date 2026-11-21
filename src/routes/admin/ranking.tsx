import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/ranking")({
	beforeLoad: () => {
		throw redirect({ to: "/classement", replace: true, statusCode: 308 });
	},
});
