import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "./schema.ts";

const client = createClient({
	url: process.env.DATABASE_URL!,
	authToken: process.env.TURSO_AUTH_TOKEN,
});

async function queryCallback(sql: string, params: any[], method: "all" | "run" | "get") {
	const result = await client.execute({ sql, args: params ?? [] });
	return { rows: result.rows };
}

async function batchCallback(queries: { sql: string; params: any[]; method: "all" | "run" | "get" }[]) {
	const results = await Promise.all(
		queries.map((q) => client.execute({ sql: q.sql, args: q.params ?? [] })),
	);
	return results.map((r) => ({ rows: r.rows }));
}

export const db = drizzle(queryCallback, batchCallback, { schema });
