import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema/index.js";

// process.env (no import.meta.env): Astro expone las variables de servidor
// ahí también (ver docs de env vars de Astro), y así este cliente funciona
// igual en el runtime SSR que en scripts standalone como src/db/seed.ts,
// ejecutados vía ts-node fuera de Vite.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const db = drizzle(pool, { schema, mode: "default" });
