import { expect, it, vi } from "vitest";

// Keep the real TanStack builder: a transport mock can conceal removed APIs.
// Only module initialization is tested, with no database connection or writes.
vi.mock("#/db", () => ({ db: {} }));

it("loads server functions with the installed TanStack Start API", async () => {
	const [players, tournaments] = await Promise.all([
		import("./functions/players"),
		import("./functions/tournaments"),
	]);
	for (const fn of [
		players.createPlayer,
		players.togglePlayerPresence,
		players.deletePlayer,
		tournaments.updateAvailableCourts,
		tournaments.submitMatchScore,
		tournaments.updateMatchScore,
		tournaments.updateTournamentSettings,
	])
		expect(typeof fn).toBe("function");
});
