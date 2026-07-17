import { drizzle } from "drizzle-orm/sqlite-proxy";
import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;

export async function initDb() {
  if (!dbInstance) {
    // Under the hood, tauri-plugin-sql loads database.sqlite in the app data directory
    dbInstance = await Database.load("sqlite:database.sqlite");
    
    // Seed default wardrobe if not exists
    await dbInstance.execute(
      "INSERT OR IGNORE INTO wardrobes (id, name) VALUES (1, 'My Wardrobe')"
    );
  }
  return dbInstance;
}

// Custom Drizzle SQLite Proxy driver
export const db = drizzle(
  async (sql, params, method) => {
    const conn = await initDb();
    
    try {
      console.log("SQL Proxy Execution:", { sql, params, method });
      if (method === "run") {
        const res = await conn.execute(sql, params);
        // SQLite proxy expects rows to be returned as an array
        return { rows: [] };
      }
      
      const rows = await conn.select<any[]>(sql, params);
      
      if (method === "all") {
        // Convert array of objects to array of arrays of values for positional mapping
        return { rows: rows.map(row => Object.values(row)) };
      }
      
      return { rows };
    } catch (err) {
      console.error("Database query failed:", { sql, params, method }, err);
      throw err;
    }
  }
);
