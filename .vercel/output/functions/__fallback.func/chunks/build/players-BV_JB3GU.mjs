import { o as createServerFn } from "./server.mjs";
import { i as lazyRouteComponent, r as createSsrRpc, t as createFileRoute } from "./createSsrRpc-CuUGFZ1G.mjs";
import { a as zod_default } from "./zod-BVSic0_0.mjs";
//#region .nitro/vite/services/ssr/assets/players-BV_JB3GU.js
var playerSchema = zod_default.object({
	firstname: zod_default.string().min(2, "Le prénom est trop court").max(50, "Le prénom est trop long"),
	lastname: zod_default.string().max(50, "Le nom est trop long").optional().default(""),
	gender: zod_default.enum(["M", "F"]).optional().default("M")
});
var createPlayer = createServerFn({ method: "POST" }).inputValidator(playerSchema).handler(createSsrRpc("25586e69f4643b4820e5ae54200cfcdf35ae36842ffe5b964c361f85860d0fa0"));
var togglePlayerPresence = createServerFn({ method: "POST" }).inputValidator(zod_default.object({
	playerId: zod_default.number(),
	isPresent: zod_default.boolean()
})).handler(createSsrRpc("63f1cc9bfb67779965405e602da6ab1cbe6ef873ff1635bb3b116a281220dd8a"));
var deletePlayer = createServerFn({ method: "POST" }).inputValidator(zod_default.object({ playerId: zod_default.number() })).handler(createSsrRpc("ec886e040ec01ac79b2a5f08da1e1443d4e5daa3197a8cde76dbccf17b565e4a"));
var getPlayers = createServerFn({ method: "GET" }).handler(createSsrRpc("aab7824603f3b321d4683bab2eb5e4d01e1ec1c3b3dbc0d599a078898e2ff483"));
var $$splitComponentImporter = () => import("./players-DMQJEHh-.mjs");
var Route = createFileRoute("/admin/players")({
	loader: async () => {
		return { allPlayers: await getPlayers() };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { togglePlayerPresence as i, createPlayer as n, deletePlayer as r, Route as t };
