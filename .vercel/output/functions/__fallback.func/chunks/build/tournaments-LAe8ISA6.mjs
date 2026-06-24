import { o as createServerFn } from "./server.mjs";
import { r as createSsrRpc } from "./createSsrRpc-CuUGFZ1G.mjs";
import { i as object, n as boolean$1, r as number$1, t as _enum } from "./zod-BVSic0_0.mjs";
//#region .nitro/vite/services/ssr/assets/tournaments-LAe8ISA6.js
createServerFn({ method: "POST" }).inputValidator((data) => object({ courts: number$1().min(1).max(10) }).parse(data)).handler(createSsrRpc("8d2e207e010b40940c2f6b0d917970309f322336774c6caf1d1e60c8dd40e989"));
createServerFn({ method: "GET" }).handler(createSsrRpc("3f88fed95f4abf72603ded5affb40a9ccb1a000f3ba5f2152f593cdb77194693"));
var startNextRound = createServerFn({ method: "POST" }).handler(createSsrRpc("029301dfbdc01e586f0b964812ee6b0356a8caf71611a92dccf07011e6bd9009"));
var submitMatchScore = createServerFn({ method: "POST" }).inputValidator(object({
	matchId: number$1(),
	scoreTeam1: number$1().min(0),
	scoreTeam2: number$1().min(0)
})).handler(createSsrRpc("d075379c2e3f8e620c0bf26a68e765db6e792f337f2273b00734bcdcbabd71bd"));
var updateMatchScore = createServerFn({ method: "POST" }).inputValidator(object({
	matchId: number$1(),
	scoreTeam1: number$1().min(0),
	scoreTeam2: number$1().min(0)
})).handler(createSsrRpc("77c0749366b6866dd3a9cf2e2931681fd774e6512c889c968cd2c464a7528276"));
var getCurrentRoundData = createServerFn({ method: "GET" }).handler(createSsrRpc("dae972515382f12ff116a31a0ea7fdb01f1b4d96249119fc09dbedb50c0cb875"));
var getRoundRobinSchedule = createServerFn({ method: "GET" }).handler(createSsrRpc("94617b320229a68017a15da6b5a92ed2bb577bd47a90076070aa7a7e9d75611d"));
var getMatchHistory = createServerFn({ method: "GET" }).handler(createSsrRpc("fe88c873682b128c9d3308f250503bd51cfed64bd515d0da9b8e2e854e8311f3"));
var getRankingData = createServerFn({ method: "GET" }).handler(createSsrRpc("1492b33a06770c3849f5aa39544a82704eaee8cfa08baaf4ba800876d09356ca"));
var finishTournament = createServerFn({ method: "POST" }).handler(createSsrRpc("711d4175241775fccb8b4d02f93c0e0e9dcf8a861b696ae6086fbf068fe54e63"));
var updateTournamentSettings = createServerFn({ method: "POST" }).inputValidator(object({
	roundType: _enum([
		"infinite",
		"fixed",
		"roundrobin"
	]),
	maxRounds: number$1().min(0),
	maximizeParity: boolean$1(),
	availableCourts: number$1().min(1)
})).handler(createSsrRpc("fcbb745a904ae1470ad2b409368419f6af057295b519a1da50366222ca89eb7c"));
var resetTournament = createServerFn({ method: "POST" }).handler(createSsrRpc("6b72514699143b7e6c67c40f8a27e88e983563d79e7b5dfb1b6eb5d554bd47a2"));
//#endregion
export { getRoundRobinSchedule as a, submitMatchScore as c, getRankingData as i, updateMatchScore as l, getCurrentRoundData as n, resetTournament as o, getMatchHistory as r, startNextRound as s, finishTournament as t, updateTournamentSettings as u };
