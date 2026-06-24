import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { RemotePreparedQuery } from "drizzle-orm/sqlite-proxy/session";
import { mapResultRow } from "drizzle-orm/utils";

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

// The sqlite-proxy driver's mapGetResult and mapAllResult pass rows directly to
// mapResultRow which expects flat arrays, but @libsql/client/http returns rows as
// objects ({ col: value }). These overrides convert object rows to flat arrays first.
RemotePreparedQuery.prototype.mapGetResult = function (rows: any, isFromBatch?: boolean) {
	if (isFromBatch) rows = rows.rows;
	if (!rows || rows.length === 0) return undefined;
	const rawRow = rows[0] as Record<string, unknown>;
	if (!this.fields && !this.customResultMapper) return rawRow;
	if (this.customResultMapper) return this.customResultMapper([rows]);
	const flatRow = this.fields.map((f: any) => rawRow[f.field.name]);
	return mapResultRow(this.fields, flatRow, this.joinsNotNullableMap);
};

RemotePreparedQuery.prototype.mapAllResult = function (rows: any, isFromBatch?: boolean) {
	if (isFromBatch) rows = rows.rows;
	if (!this.fields && !this.customResultMapper) return rows;
	if (this.customResultMapper) return this.customResultMapper(rows);
	return rows.map((row: any) => {
		const flatRow = this.fields.map((f: any) => row[f.field.name]);
		return mapResultRow(this.fields, flatRow, this.joinsNotNullableMap);
	});
};

export const db = drizzle(queryCallback, batchCallback, { schema });
