import { drizzle } from "drizzle-orm/sqlite-proxy";
import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;

export async function initDb() {
  if (!dbInstance) {
    // tauri-plugin-sql (sqlite via sqlx) stores the DB in app_config_dir (~/.config/app-id/)
    dbInstance = await Database.load("sqlite:database.sqlite");

    // Seed default wardrobe if not exists
    await dbInstance.execute(
      "INSERT OR IGNORE INTO wardrobes (id, name) VALUES (1, 'My Wardrobe')"
    );
  }
  return dbInstance;
}

// Custom Drizzle SQLite Proxy driver.
// IMPORTANT: tauri-plugin-sql uses sqlx under the hood which uses positional '?'
// placeholders for SQLite (NOT '$1,$2' which is for PostgreSQL).
// Drizzle sqlite-proxy also generates '?' placeholders — so we pass SQL through as-is.
export const db = drizzle(async (sql, params, method) => {
  const conn = await initDb();

  try {
    if (method === "run") {
      await conn.execute(sql, params as unknown[]);
      return { rows: [] };
    }

    const rows = await conn.select<Record<string, unknown>[]>(sql, params as unknown[]);

    if (method === "all") {
      // Drizzle sqlite-proxy expects rows as arrays of values (positional), not objects
      return { rows: rows.map((row) => Object.values(row)) };
    }

    // For 'get' method — return first row as array
    if (rows.length > 0) {
      return { rows: [Object.values(rows[0])] };
    }
    return { rows: [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("DB error:", { sql, params, method, err: msg });
    throw err;
  }
});
