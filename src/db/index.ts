import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/libsql/http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL doit être configurée.");

const client = createClient({
	url: databaseUrl,
	authToken: process.env.TURSO_AUTH_TOKEN,
});

// The official driver creates a separate session per transaction. libSQL's
// default write transaction locks before reading, including over HTTP.
export const db = drizzle(client, { schema });
