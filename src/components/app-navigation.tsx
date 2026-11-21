import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Settings, Trophy, Users } from "lucide-react";
import { cn } from "#/lib/utils";

const destinations = [
	{ to: "/", label: "Tournoi", icon: LayoutDashboard },
	{ to: "/joueurs", label: "Joueurs", icon: Users },
	{ to: "/classement", label: "Classement", icon: Trophy },
	{ to: "/reglages", label: "Réglages", icon: Settings },
] as const;

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
	return (
		<nav
			aria-label={mobile ? "Navigation mobile" : "Navigation principale"}
			className={cn(
				mobile ? "grid grid-cols-4 gap-1" : "hidden items-center gap-1 md:flex",
			)}
		>
			{destinations.map(({ to, label, icon: Icon }) => (
				<Link
					key={to}
					to={to}
					activeOptions={{ exact: true }}
					activeProps={{
						className: "bg-primary text-primary-foreground",
						"aria-current": "page",
					}}
					inactiveProps={{
						className:
							"text-muted-foreground hover:bg-accent hover:text-accent-foreground",
					}}
					className={cn(
						"inline-flex min-w-0 items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
						mobile
							? "min-h-14 flex-col gap-1 px-1 py-2 text-xs"
							: "min-h-11 gap-2 px-3 py-2 text-sm",
					)}
				>
					<Icon aria-hidden="true" className="size-5 shrink-0" />
					<span>{label}</span>
				</Link>
			))}
		</nav>
	);
}
