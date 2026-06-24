import { i as lazyRouteComponent, t as createFileRoute } from "./createSsrRpc-CuUGFZ1G.mjs";
import { n as getCurrentRoundData } from "./tournaments-LAe8ISA6.mjs";
//#region .nitro/vite/services/ssr/assets/settings-CTZfbOIy.js
var $$splitComponentImporter = () => import("./settings-DxCuNvyI.mjs");
var Route = createFileRoute("/admin/settings")({
	loader: async () => {
		return { roundData: await getCurrentRoundData() };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
