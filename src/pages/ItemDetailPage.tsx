import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { db, initDb } from "../lib/db";
import { clothes, tags, clothTags, seasons, clothSeasons } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { convertFileSrc } from "@tauri-apps/api/core";
import { remove } from "@tauri-apps/plugin-fs";

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

interface FullItem {
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
  sleeveLength: string | null;
  neckline: string | null;
  brand: string | null;
  condition: string | null;
  weatherSuitability: string | null;
  imageOriginal: string;
  imageProcessed: string | null;
  imageThumbnail: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  checksum: string;
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<FullItem | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edited values
  const [nickname, setNickname] = useState("");
  const [type, setType] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [formality, setFormality] = useState("");
  const [weatherSuitability, setWeatherSuitability] = useState("");
  const [material, setMaterial] = useState("");
  const [pattern, setPattern] = useState("");
  const [fit, setFit] = useState("");
  
  // Associated Tags
  const [itemTags, setItemTags] = useState<{ id: number; name: string }[]>([]);
  const [newTag, setNewTag] = useState("");

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const parsedId = parseInt(id, 10);
      const res = await db.select().from(clothes).where(eq(clothes.id, parsedId));
      if (res.length === 0) {
        navigate("/wardrobe");
        return;
      }
      
      const fullItem = res[0] as FullItem;
      setItem(fullItem);
      
      // Initialize edit fields
      setNickname(fullItem.nickname || "");
      setType(fullItem.type || "");
      setPrimaryColor(fullItem.primaryColor || "");
      setFormality(fullItem.formality || "");
      setWeatherSuitability(fullItem.weatherSuitability || "");
      setMaterial(fullItem.material || "");
      setPattern(fullItem.pattern || "");
      setFit(fullItem.fit || "");

      // Load tags
      const associated = await db
        .select({
          id: tags.id,
          name: tags.name,
        })
        .from(clothTags)
        .innerJoin(tags, eq(clothTags.tagId, tags.id))
        .where(eq(clothTags.clothId, parsedId));
      setItemTags(associated);
    } catch (err) {
      console.error("Failed to load item details:", err);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleSaveChanges = async () => {
    if (!item) return;
    try {
      const conn = await initDb();
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      await conn.execute(
        `UPDATE clothes SET nickname = ?, type = ?, primary_color = ?, formality = ?,
         weather_suitability = ?, material = ?, pattern = ?, fit = ?, updated_at = ?
         WHERE id = ?`,
        [nickname, type || null, primaryColor || null, formality || null,
         weatherSuitability || null, material || null, pattern || null, fit || null,
         now, item.id]
      );
      setIsEditing(false);
      fetchDetails();
    } catch (err) {
      console.error("Failed to save changes:", err);
      alert("Failed to save changes: " + String(err));
    }
  };

  const handleAddTag = async () => {
    if (!item || !newTag.trim()) return;
    try {
      const formatted = newTag.trim();
      
      // Find or create tag
      let tagId: number;
      let existingTag = await db.select().from(tags).where(eq(tags.name, formatted));
      
      if (existingTag.length === 0) {
        await db.insert(tags).values({ name: formatted });
        const check = await db.select().from(tags).where(eq(tags.name, formatted));
        tagId = check[0].id;
      } else {
        tagId = existingTag[0].id;
      }

      // Link tag to item
      await db.insert(clothTags).values({ clothId: item.id, tagId }).onConflictDoNothing();
      setNewTag("");
      fetchDetails();
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!item) return;
    try {
      await db
        .delete(clothTags)
        .where(
          and(
            eq(clothTags.clothId, item.id),
            eq(clothTags.tagId, tagId)
          )
        );
      fetchDetails();
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const handleDeleteItem = async () => {
    if (!item) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this item? This action is permanent.");
    if (!confirmDelete) return;

    try {
      // 1. Delete files from disk (ignore errors — file might already be gone)
      try {
        await remove(item.imageOriginal);
        if (item.imageProcessed) await remove(item.imageProcessed);
        if (item.imageThumbnail) await remove(item.imageThumbnail);
      } catch (fsErr) {
        console.warn("File deletion warning (non-fatal):", fsErr);
      }

      // 2. Delete from SQLite using raw SQL
      const conn = await initDb();
      await conn.execute("DELETE FROM cloth_tags WHERE cloth_id = ?", [item.id]);
      await conn.execute("DELETE FROM cloth_seasons WHERE cloth_id = ?", [item.id]);
      await conn.execute("DELETE FROM clothes WHERE id = ?", [item.id]);

      navigate("/wardrobe");
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert("Failed to delete item: " + String(err));
    }
  };

  if (!item) {
    return (
      <div className="empty-state">
        <h3>Loading item...</h3>
      </div>
    );
  }

  const activeImage = showOriginal ? item.imageOriginal : (item.imageProcessed || item.imageOriginal);
  const displayUrl = convertFileSrc(activeImage);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ padding: "48px 48px", minHeight: "100%", overflowY: "auto" }}
    >
      {/* Back button */}
      <Link to="/wardrobe" className="btn btn-ghost btn-sm" style={{ marginBottom: "24px" }}>
        &larr; Back to Wardrobe
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "start" }}>
        
        {/* Frame Column */}
        <div>
          <div
            className="card"
            style={{
              position: "relative",
              paddingBottom: "125%", // 4:5 aspect ratio
              background: "var(--surface-raised)",
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <img
              src={displayUrl}
              alt={item.nickname || "Clothing Item"}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          {/* Toggle background removal view */}
          {item.imageProcessed && (
            <button
              className="btn btn-outline btn-sm"
              style={{ width: "100%" }}
              onClick={() => setShowOriginal(!showOriginal)}
            >
              {showOriginal ? "Show Cutout Image" : "Show Original Image"}
            </button>
          )}
        </div>

        {/* Metadata Details Column */}
        <div>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Item Nickname
                </label>
                <input
                  type="text"
                  className="input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Category
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Color
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Occasion / Formality
                  </label>
                  <select
                    className="input"
                    value={formality}
                    onChange={(e) => setFormality(e.target.value)}
                  >
                    <option value="casual">Casual</option>
                    <option value="smart-casual">Smart Casual</option>
                    <option value="formal">Formal</option>
                    <option value="festive">Festive</option>
                    <option value="loungewear">Loungewear</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Weather / Season
                  </label>
                  <select
                    className="input"
                    value={weatherSuitability}
                    onChange={(e) => setWeatherSuitability(e.target.value)}
                  >
                    <option value="warm-weather">Warm Weather</option>
                    <option value="cold-weather">Cold Weather</option>
                    <option value="all-season">All Season</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Material
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Pattern
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button className="btn btn-primary" onClick={handleSaveChanges}>
                  Save Changes
                </button>
                <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                {item.type || "Unclassified"}
              </span>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2.5rem",
                  fontWeight: 500,
                  color: "var(--primary)",
                  marginBottom: "24px",
                }}
              >
                {item.nickname || "Clothing Item"}
              </h1>

              {/* Attributes Specs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px 24px",
                  padding: "20px",
                  background: "var(--surface)",
                  borderRadius: "var(--card-radius)",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "32px",
                }}
              >
                <div>
                  <h5 style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                    Primary Color
                  </h5>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 500, textTransform: "capitalize" }}>
                    {item.primaryColor || "—"}
                  </p>
                </div>
                <div>
                  <h5 style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                    Formality
                  </h5>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 500, textTransform: "capitalize" }}>
                    {item.formality || "—"}
                  </p>
                </div>
                <div>
                  <h5 style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                    Weather Suitability
                  </h5>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 500, textTransform: "capitalize" }}>
                    {item.weatherSuitability?.replace("-", " ") || "—"}
                  </p>
                </div>
                <div>
                  <h5 style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                    Material
                  </h5>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 500, textTransform: "capitalize" }}>
                    {item.material || "—"}
                  </p>
                </div>
                <div>
                  <h5 style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                    Pattern
                  </h5>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 500, textTransform: "capitalize" }}>
                    {item.pattern || "—"}
                  </p>
                </div>
                {item.fit && (
                  <div>
                    <h5 style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                      Fit
                    </h5>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 500, textTransform: "capitalize" }}>
                      {item.fit || "—"}
                    </p>
                  </div>
                )}
              </div>

              {/* Tag Management */}
              <div style={{ marginBottom: "36px" }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", marginBottom: "12px", color: "var(--primary)" }}>
                  Wardrobe Tags
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                  {itemTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="badge badge-ghost"
                      style={{
                        padding: "4px 10px",
                        gap: "6px",
                        alignItems: "center",
                      }}
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--error)",
                          fontWeight: "bold",
                          fontSize: "0.8rem",
                        }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {itemTags.length === 0 && (
                    <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>No custom tags added yet.</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", maxWidth: "300px" }}>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: "5px 10px", fontSize: "0.85rem" }}
                    placeholder="Add custom tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  />
                  <button className="btn btn-outline btn-sm" onClick={handleAddTag}>
                    Add
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  paddingTop: "24px",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                  Edit Details
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ color: "var(--error)" }}
                  onClick={handleDeleteItem}
                >
                  Delete Item
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
