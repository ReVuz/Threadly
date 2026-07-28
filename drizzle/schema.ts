import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

/* ─── Wardrobes ─────────────────────────────────────────── */

export const wardrobes = sqliteTable("wardrobes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const wardrobesRelations = relations(wardrobes, ({ many }) => ({
  clothes: many(clothes),
  outfits: many(outfits),
  wishlist: many(wishlist),
}));

/* ─── Clothes ───────────────────────────────────────────── */

export const clothes = sqliteTable("clothes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wardrobeId: integer("wardrobe_id")
    .notNull()
    .references(() => wardrobes.id, { onDelete: "cascade" }),
  uuid: text("uuid").notNull().unique(),
  nickname: text("nickname"),
  
  // AI/Manual Attributes
  type: text("type"), // dress, top, bottom, jacket, co-ord, ethnic, etc.
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  pattern: text("pattern"),
  material: text("material"),
  fit: text("fit"),
  formality: text("formality"),
  sleeveLength: text("sleeve_length"),
  neckline: text("neckline"),
  brand: text("brand"),
  condition: text("condition"),
  weatherSuitability: text("weather_suitability"),

  // File metadata
  imageOriginal: text("image_original").notNull(),
  imageProcessed: text("image_processed"),
  imageThumbnail: text("image_thumbnail"),
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  checksum: text("checksum").notNull().unique(),

  // AI Pipeline Status
  aiStatus: text("ai_status", { enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] })
    .default("PENDING")
    .notNull(),
  aiAnalyzedAt: text("ai_analyzed_at"),
  aiRawJson: text("ai_raw_json"), // Stores exact JSON payload from Gemini

  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const clothesRelations = relations(clothes, ({ one, many }) => ({
  wardrobe: one(wardrobes, {
    fields: [clothes.wardrobeId],
    references: [wardrobes.id],
  }),
  tags: many(clothTags),
  seasons: many(clothSeasons),
  outfitItems: many(outfitItems),
}));

/* ─── Tags (Many-to-Many) ───────────────────────────────── */

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
  clothes: many(clothTags),
}));

export const clothTags = sqliteTable(
  "cloth_tags",
  {
    clothId: integer("cloth_id")
      .notNull()
      .references(() => clothes.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.clothId, t.tagId] })]
);

export const clothTagsRelations = relations(clothTags, ({ one }) => ({
  cloth: one(clothes, {
    fields: [clothTags.clothId],
    references: [clothes.id],
  }),
  tag: one(tags, {
    fields: [clothTags.tagId],
    references: [tags.id],
  }),
}));

/* ─── Seasons (Many-to-Many) ─────────────────────────────── */

export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // summer, winter, monsoon, all-season, etc.
});

export const seasonsRelations = relations(seasons, ({ many }) => ({
  clothes: many(clothSeasons),
}));

export const clothSeasons = sqliteTable(
  "cloth_seasons",
  {
    clothId: integer("cloth_id")
      .notNull()
      .references(() => clothes.id, { onDelete: "cascade" }),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.clothId, t.seasonId] })]
);

export const clothSeasonsRelations = relations(clothSeasons, ({ one }) => ({
  cloth: one(clothes, {
    fields: [clothSeasons.clothId],
    references: [clothes.id],
  }),
  season: one(seasons, {
    fields: [clothSeasons.seasonId],
    references: [seasons.id],
  }),
}));

/* ─── Outfits ───────────────────────────────────────────── */

export const outfits = sqliteTable("outfits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wardrobeId: integer("wardrobe_id")
    .notNull()
    .references(() => wardrobes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  occasion: text("occasion"),
  rating: integer("rating").default(0),
  favorite: integer("favorite").default(0), // 0 or 1
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const outfitsRelations = relations(outfits, ({ one, many }) => ({
  wardrobe: one(wardrobes, {
    fields: [outfits.wardrobeId],
    references: [wardrobes.id],
  }),
  items: many(outfitItems),
}));

export const outfitItems = sqliteTable(
  "outfit_items",
  {
    outfitId: integer("outfit_id")
      .notNull()
      .references(() => outfits.id, { onDelete: "cascade" }),
    clothId: integer("cloth_id")
      .notNull()
      .references(() => clothes.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.outfitId, t.clothId] })]
);

export const outfitItemsRelations = relations(outfitItems, ({ one }) => ({
  outfit: one(outfits, {
    fields: [outfitItems.outfitId],
    references: [outfits.id],
  }),
  cloth: one(clothes, {
    fields: [outfitItems.clothId],
    references: [clothes.id],
  }),
}));

/* ─── Wishlist ──────────────────────────────────────────── */

export const wishlist = sqliteTable("wishlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wardrobeId: integer("wardrobe_id")
    .notNull()
    .references(() => wardrobes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  reason: text("reason"),
  priority: integer("priority").default(3), // 1 (High) to 5 (Low)
  estimatedOutfitUnlockCount: integer("estimated_outfit_unlock_count").default(0),
  aiGenerated: integer("ai_generated").default(0), // 0 or 1
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  wardrobe: one(wardrobes, {
    fields: [wishlist.wardrobeId],
    references: [wardrobes.id],
  }),
}));
