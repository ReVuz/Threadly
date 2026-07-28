import { drizzle } from "drizzle-orm/sqlite-proxy";
import Database from "@tauri-apps/plugin-sql";
import { buildFtsMatchQuery } from "./search";

let dbInstance: Database | null = null;

export async function initDb() {
  if (!dbInstance) {
    // tauri-plugin-sql (sqlite via sqlx) stores the DB in app_config_dir (~/.config/app-id/)
    dbInstance = await Database.load("sqlite:database.sqlite");

    // Seed default wardrobe if not exists
    await dbInstance.execute(
      "INSERT OR IGNORE INTO wardrobes (id, name) VALUES (1, 'My Wardrobe')"
    );

    // Create FTS5 virtual table
    await dbInstance.execute(
      `CREATE VIRTUAL TABLE IF NOT EXISTS clothes_fts USING fts5(
        cloth_id,
        nickname,
        type,
        primary_color,
        pattern,
        material,
        fit,
        formality,
        weather_suitability,
        tags
      )`
    );

    // Sync all FTS index on startup
    await syncAllFts();
  }
  return dbInstance;
}

/**
 * Synchronizes a single clothing item with the FTS5 index.
 */
export async function syncFts(clothId: number) {
  try {
    const conn = await initDb();
    
    // Fetch item details and its tags
    const itemRows = await conn.select<any[]>(
      `SELECT c.id, c.nickname, c.type, c.primary_color, c.pattern, c.material, c.fit, c.formality, c.weather_suitability,
       (SELECT group_concat(t.name, ' ') FROM cloth_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.cloth_id = c.id) as tags_list
       FROM clothes c WHERE c.id = ?`,
      [clothId]
    );

    if (itemRows.length === 0) {
      // Item was deleted, remove from FTS5 index
      await conn.execute(`DELETE FROM clothes_fts WHERE cloth_id = ?`, [clothId]);
      return;
    }

    const item = itemRows[0];
    const tagsStr = item.tags_list || "";

    // Check if item already exists in FTS index
    const checkRows = await conn.select<any[]>(
      `SELECT 1 FROM clothes_fts WHERE cloth_id = ?`,
      [clothId]
    );

    if (checkRows.length > 0) {
      await conn.execute(
        `UPDATE clothes_fts SET nickname = ?, type = ?, primary_color = ?, pattern = ?, material = ?, fit = ?, formality = ?, weather_suitability = ?, tags = ? WHERE cloth_id = ?`,
        [
          item.nickname || "",
          item.type || "",
          item.primary_color || "",
          item.pattern || "",
          item.material || "",
          item.fit || "",
          item.formality || "",
          item.weather_suitability || "",
          tagsStr,
          clothId
        ]
      );
    } else {
      await conn.execute(
        `INSERT INTO clothes_fts (cloth_id, nickname, type, primary_color, pattern, material, fit, formality, weather_suitability, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clothId,
          item.nickname || "",
          item.type || "",
          item.primary_color || "",
          item.pattern || "",
          item.material || "",
          item.fit || "",
          item.formality || "",
          item.weather_suitability || "",
          tagsStr
        ]
      );
    }
  } catch (err) {
    console.error(`[FTS Sync] Failed for item ${clothId}:`, err);
  }
}

/**
 * Fully synchronizes all wardrobe items to the FTS5 index (typically on startup).
 */
export async function syncAllFts() {
  try {
    const conn = await initDb();
    
    // Clear FTS index
    await conn.execute(`DELETE FROM clothes_fts`);

    // Fetch all items and their tags
    const items = await conn.select<any[]>(
      `SELECT c.id, c.nickname, c.type, c.primary_color, c.pattern, c.material, c.fit, c.formality, c.weather_suitability,
       (SELECT group_concat(t.name, ' ') FROM cloth_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.cloth_id = c.id) as tags_list
       FROM clothes c`
    );

    for (const item of items) {
      const tagsStr = item.tags_list || "";
      await conn.execute(
        `INSERT INTO clothes_fts (cloth_id, nickname, type, primary_color, pattern, material, fit, formality, weather_suitability, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.nickname || "",
          item.type || "",
          item.primary_color || "",
          item.pattern || "",
          item.material || "",
          item.fit || "",
          item.formality || "",
          item.weather_suitability || "",
          tagsStr
        ]
      );
    }
    console.info(`[FTS Sync] Re-indexed ${items.length} item(s) on startup`);
  } catch (err) {
    console.error("[FTS Sync] Full sync failed:", err);
  }
}

export interface SearchResultRow {
  id: number;
  uuid: string;
  nickname: string | null;
  type: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  material: string | null;
  fit: string | null;
  formality: string | null;
  weatherSuitability: string | null;
  imageOriginal: string;
  imageProcessed: string | null;
  imageThumbnail: string | null;
  tagsText: string | null;
  createdAt: string;
}

/**
 * Runs a wardrobe search against the FTS index and falls back to recent wardrobe rows.
 * The raw SQL is kept here so the UI can remain testable with a mocked `searchClothes`.
 */
export async function searchClothes(wardrobeId: number, query: string): Promise<SearchResultRow[]> {
  const conn = await initDb();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return conn.select<SearchResultRow[]>(
      `SELECT c.id, c.uuid, c.nickname, c.type, c.primary_color as primaryColor,
              c.secondary_color as secondaryColor, c.pattern, c.material, c.fit,
              c.formality, c.weather_suitability as weatherSuitability,
              c.image_original as imageOriginal, c.image_processed as imageProcessed,
              c.image_thumbnail as imageThumbnail,
              (SELECT group_concat(t.name, ' ')
               FROM cloth_tags ct
               JOIN tags t ON t.id = ct.tag_id
               WHERE ct.cloth_id = c.id) as tagsText,
              c.created_at as createdAt
       FROM clothes c
       WHERE c.wardrobe_id = ?
       ORDER BY c.created_at DESC`,
      [wardrobeId]
    );
  }

  const matchExpression = buildFtsMatchQuery(trimmedQuery);
  if (!matchExpression) {
    return [];
  }

  return conn.select<SearchResultRow[]>(
    `SELECT c.id, c.uuid, c.nickname, c.type, c.primary_color as primaryColor,
            c.secondary_color as secondaryColor, c.pattern, c.material, c.fit,
            c.formality, c.weather_suitability as weatherSuitability,
            c.image_original as imageOriginal, c.image_processed as imageProcessed,
            c.image_thumbnail as imageThumbnail,
            (SELECT group_concat(t.name, ' ')
             FROM cloth_tags ct
             JOIN tags t ON t.id = ct.tag_id
             WHERE ct.cloth_id = c.id) as tagsText,
            c.created_at as createdAt
     FROM clothes c
     JOIN clothes_fts fts ON fts.cloth_id = c.id
     WHERE c.wardrobe_id = ? AND fts MATCH ?
     ORDER BY c.created_at DESC`,
    [wardrobeId, matchExpression]
  );
}

// Custom Drizzle SQLite Proxy driver.
export const db = drizzle(async (sql, params, method) => {
  const conn = await initDb();

  try {
    if (method === "run") {
      await conn.execute(sql, params as unknown[]);
      return { rows: [] };
    }

    const rows = await conn.select<Record<string, unknown>[]>(sql, params as unknown[]);

    if (method === "all") {
      return { rows: rows.map((row) => Object.values(row)) };
    }

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
