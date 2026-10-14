import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = postgres(url, { prepare: false });
export const db = drizzle(client, { schema });
export type Db = typeof db;
/** Close the pool so scripts can exit naturally (process.exit can truncate piped stdout). */
export const closeDb = () => client.end();
