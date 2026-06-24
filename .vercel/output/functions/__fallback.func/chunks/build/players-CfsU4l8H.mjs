import { o as createServerFn } from "./server.mjs";
import { a as zod_default } from "./zod-BVSic0_0.mjs";
import { a as eq, c as players, n as createServerRpc, r as db } from "./db--EECSrl1.mjs";
//#region .nitro/vite/services/ssr/assets/players-CfsU4l8H.js
var playerSchema = zod_default.object({
	firstname: zod_default.string().min(2, "Le prénom est trop court").max(50, "Le prénom est trop long"),
	lastname: zod_default.string().max(50, "Le nom est trop long").optional().default(""),
	gender: zod_default.enum(["M", "F"]).optional().default("M")
});
var createPlayer_createServerFn_handler = createServerRpc({
	id: "25586e69f4643b4820e5ae54200cfcdf35ae36842ffe5b964c361f85860d0fa0",
	name: "createPlayer",
	filename: "src/server/functions/players.ts"
}, (opts) => createPlayer.__executeServer(opts));
var createPlayer = createServerFn({ method: "POST" }).inputValidator(playerSchema).handler(createPlayer_createServerFn_handler, async ({ data }) => {
	await db.insert(players).values({
		firstname: data.firstname,
		lastname: data.lastname,
		gender: data.gender,
		present: true
	});
	return { success: true };
});
var togglePlayerPresence_createServerFn_handler = createServerRpc({
	id: "63f1cc9bfb67779965405e602da6ab1cbe6ef873ff1635bb3b116a281220dd8a",
	name: "togglePlayerPresence",
	filename: "src/server/functions/players.ts"
}, (opts) => togglePlayerPresence.__executeServer(opts));
var togglePlayerPresence = createServerFn({ method: "POST" }).inputValidator(zod_default.object({
	playerId: zod_default.number(),
	isPresent: zod_default.boolean()
})).handler(togglePlayerPresence_createServerFn_handler, async ({ data }) => {
	await db.update(players).set({ present: data.isPresent }).where(eq(players.id, data.playerId));
	return { success: true };
});
var deletePlayer_createServerFn_handler = createServerRpc({
	id: "ec886e040ec01ac79b2a5f08da1e1443d4e5daa3197a8cde76dbccf17b565e4a",
	name: "deletePlayer",
	filename: "src/server/functions/players.ts"
}, (opts) => deletePlayer.__executeServer(opts));
var deletePlayer = createServerFn({ method: "POST" }).inputValidator(zod_default.object({ playerId: zod_default.number() })).handler(deletePlayer_createServerFn_handler, async ({ data }) => {
	await db.delete(players).where(eq(players.id, data.playerId));
	return { success: true };
});
var getPlayers_createServerFn_handler = createServerRpc({
	id: "aab7824603f3b321d4683bab2eb5e4d01e1ec1c3b3dbc0d599a078898e2ff483",
	name: "getPlayers",
	filename: "src/server/functions/players.ts"
}, (opts) => getPlayers.__executeServer(opts));
var getPlayers = createServerFn({ method: "GET" }).handler(getPlayers_createServerFn_handler, async () => {
	return await db.select().from(players).orderBy(players.lastname);
});
//#endregion
export { createPlayer_createServerFn_handler, deletePlayer_createServerFn_handler, getPlayers_createServerFn_handler, togglePlayerPresence_createServerFn_handler };
