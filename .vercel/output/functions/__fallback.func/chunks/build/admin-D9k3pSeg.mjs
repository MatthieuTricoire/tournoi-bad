import { i as lazyRouteComponent, t as createFileRoute } from "./createSsrRpc-CuUGFZ1G.mjs";
import { a as getRoundRobinSchedule, n as getCurrentRoundData } from "./tournaments-LAe8ISA6.mjs";
//#region .nitro/vite/services/ssr/assets/admin-D9k3pSeg.js
var $$splitComponentImporter = () => import("./admin-BAil4Bow.mjs");
var Route = createFileRoute("/admin/")({
	loader: async () => {
		const [roundData, scheduleData] = await Promise.all([getCurrentRoundData(), getRoundRobinSchedule()]);
		return {
			roundData,
			scheduleData
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
