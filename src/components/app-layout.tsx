import { Link, Outlet } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { AppNavigation } from "./app-navigation";

export function AppLayout() {
	return (
		<div className="min-h-dvh">
			<a
				href="#contenu-principal"
				className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:outline-2 focus:outline-offset-2 focus:outline-ring"
			>
				Aller au contenu
			</a>
			<header className="border-b bg-card">
				<div className="mx-auto flex min-h-20 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
					<Link
						to="/"
						className="inline-flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
						aria-label="Badminton — accueil du tournoi"
					>
						<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
							<Trophy className="size-6" aria-hidden="true" />
						</span>
						<span>
							<span className="block text-lg font-extrabold tracking-tight text-foreground">
								Badminton
							</span>
							<span className="block text-xs font-medium text-muted-foreground">
								Tournoi associatif
							</span>
						</span>
					</Link>
					<AppNavigation />
				</div>
			</header>
			<main
				id="contenu-principal"
				tabIndex={-1}
				className="mx-auto w-full min-w-0 max-w-5xl space-y-6 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:py-8"
			>
				<Outlet />
			</main>
			<div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pt-2 pr-[max(.5rem,env(safe-area-inset-right))] pb-[calc(.5rem+env(safe-area-inset-bottom))] pl-[max(.5rem,env(safe-area-inset-left))] shadow-sm md:hidden">
				<AppNavigation mobile />
			</div>
		</div>
	);
}
