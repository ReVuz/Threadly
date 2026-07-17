import { describe, it, expect } from "vitest";
import { db, initDb } from "../lib/db";
import { wardrobes } from "../../drizzle/schema";

describe("Database client", () => {
  it("initializes tauri-plugin-sql connection and handles seed wardrobe query", async () => {
    const conn = await initDb();
    expect(conn).toBeDefined();

    // Query wardrobes using Drizzle ORM
    const allWardrobes = await db.select().from(wardrobes);
    
    expect(allWardrobes).toBeInstanceOf(Array);
    expect(allWardrobes.length).toBe(1);
    expect(allWardrobes[0].name).toBe("My Wardrobe");
  });
});
