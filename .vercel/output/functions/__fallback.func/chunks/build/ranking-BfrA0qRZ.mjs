import { i as lazyRouteComponent, t as createFileRoute } from "./createSsrRpc-CuUGFZ1G.mjs";
import { i as getRankingData, n as getCurrentRoundData, r as getMatchHistory } from "./tournaments-LAe8ISA6.mjs";
//#region .nitro/vite/services/ssr/assets/ranking-BfrA0qRZ.js
var $$splitComponentImporter = () => import("./ranking-BSIB4K6l.mjs");
var Route = createFileRoute("/admin/ranking")({
	loader: async () => {
		const [ranking, roundData, matchHistory] = await Promise.all([
			getRankingData(),
			getCurrentRoundData(),
			getMatchHistory()
		]);
		return {
			ranking,
			roundData,
			matchHistory
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
