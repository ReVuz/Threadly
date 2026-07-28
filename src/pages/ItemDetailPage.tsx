import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { remove } from "@tauri-apps/plugin-fs";
import { and, eq } from "drizzle-orm";
import { clothes, clothTags, tags } from "../../drizzle/schema";
import { db, initDb, syncFts } from "../lib/db";
import { useQueue } from "../context/QueueContext";
import { buildStylingNotes, type WardrobeItemSummary } from "../lib/editorial";

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

interface FullItem extends WardrobeItemSummary {
  uuid: string;
  imageOriginal: string;
  imageProcessed: string | null;
  imageThumbnail: string | null;
  secondaryColor: string | null;
  sleeveLength: string | null;
  neckline: string | null;
  brand: string | null;
  condition: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  checksum: string;
}

type ModalMode = "outfit" | "wishlist" | null;

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshAll } = useQueue();
  const [item, setItem] = useState<FullItem | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const [nickname, setNickname] = useState("");
  const [type, setType] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [formality, setFormality] = useState("");
  const [weatherSuitability, setWeatherSuitability] = useState("");
  const [material, setMaterial] = useState("");
  const [pattern, setPattern] = useState("");
  const [fit, setFit] = useState("");
  const [itemTags, setItemTags] = useState<{ id: number; name: string }[]>([]);
  const [newTag, setNewTag] = useState("");

  const parsedId = useMemo(() => (id ? Number.parseInt(id, 10) : NaN), [id]);

  const fetchDetails = useCallback(async () => {
    if (!Number.isFinite(parsedId)) return;

    try {
      setLoadingError(null);
      const rows = await db.select().from(clothes).where(eq(clothes.id, parsedId));
      if (rows.length === 0) {
        navigate("/wardrobe");
        return;
      }

      const fullItem = rows[0] as FullItem;
      setItem(fullItem);
      setNickname(fullItem.nickname || "");
      setType(fullItem.type || "");
      setPrimaryColor(fullItem.primaryColor || "");
      setFormality(fullItem.formality || "");
      setWeatherSuitability(fullItem.weatherSuitability || "");
      setMaterial(fullItem.material || "");
      setPattern(fullItem.pattern || "");
      setFit(fullItem.fit || "");

      const tagsRows = await db
        .select({
          id: tags.id,
          name: tags.name,
        })
        .from(clothTags)
        .innerJoin(tags, eq(clothTags.tagId, tags.id))
        .where(eq(clothTags.clothId, parsedId));
      setItemTags(tagsRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Item detail failed to load: ${message}`);
    }
  }, [parsedId, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDetails();
  }, [fetchDetails]);

  const handleSaveChanges = async () => {
    if (!item) return;

    try {
      const conn = await initDb();
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      await conn.execute(
        `UPDATE clothes
         SET nickname = ?, type = ?, primary_color = ?, formality = ?,
             weather_suitability = ?, material = ?, pattern = ?, fit = ?, updated_at = ?
         WHERE id = ?`,
        [
          nickname,
          type || null,
          primaryColor || null,
          formality || null,
          weatherSuitability || null,
          material || null,
          pattern || null,
          fit || null,
          now,
          item.id,
        ]
      );
      await syncFts(item.id);
      setIsEditing(false);
      await fetchDetails();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to save metadata: ${message}`);
    }
  };

  const handleAddTag = async () => {
    if (!item || !newTag.trim()) return;

    try {
      const formatted = newTag.trim();
      const existing = await db.select().from(tags).where(eq(tags.name, formatted));

      let tagId: number;
      if (existing.length === 0) {
        await db.insert(tags).values({ name: formatted });
        const inserted = await db.select().from(tags).where(eq(tags.name, formatted));
        tagId = inserted[0].id;
      } else {
        tagId = existing[0].id;
      }

      await db.insert(clothTags).values({ clothId: item.id, tagId }).onConflictDoNothing();
      await syncFts(item.id);
      setNewTag("");
      await fetchDetails();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to add tag: ${message}`);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!item) return;

    try {
      await db.delete(clothTags).where(and(eq(clothTags.clothId, item.id), eq(clothTags.tagId, tagId)));
      await syncFts(item.id);
      await fetchDetails();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to remove tag: ${message}`);
    }
  };

  const handleDeleteItem = async () => {
    if (!item) return;
    const confirmDelete = window.confirm("Delete this item permanently?");
    if (!confirmDelete) return;

    try {
      try {
        await remove(item.imageOriginal);
        if (item.imageProcessed) await remove(item.imageProcessed);
        if (item.imageThumbnail) await remove(item.imageThumbnail);
      } catch (fsErr) {
        console.warn("File deletion warning:", fsErr);
      }

      const conn = await initDb();
      await conn.execute("DELETE FROM cloth_tags WHERE cloth_id = ?", [item.id]);
      await conn.execute("DELETE FROM cloth_seasons WHERE cloth_id = ?", [item.id]);
      await conn.execute("DELETE FROM clothes WHERE id = ?", [item.id]);
      await syncFts(item.id);
      navigate("/wardrobe");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to delete item: ${message}`);
    }
  };

  const markForReanalysis = async () => {
    if (!item) return;
    try {
      const conn = await initDb();
      await conn.execute("UPDATE clothes SET ai_status = 'PENDING' WHERE id = ?", [item.id]);
      await refreshAll();
      await fetchDetails();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to queue re-analysis: ${message}`);
    }
  };

  if (!item) {
    return (
      <div className="empty-state">
        <h3>Loading item...</h3>
        {loadingError && <p>{loadingError}</p>}
      </div>
    );
  }

  const activeImage = showOriginal ? item.imageOriginal : item.imageProcessed || item.imageOriginal;
  const displayUrl = convertFileSrc(activeImage);

  return (
    <motion.main className="item-detail" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <Link to="/wardrobe" className="item-detail__back">
        &larr; Back to Wardrobe
      </Link>

      {loadingError && <div className="page-error">{loadingError}</div>}

      <div className="item-detail__layout">
        <section className="item-detail__visual card">
          <img className="item-detail__image" src={displayUrl} alt={item.nickname || "Clothing item"} />
          <button className="btn btn-ghost btn-sm item-detail__toggle" onClick={() => setShowOriginal((value) => !value)}>
            {showOriginal ? "Show Cutout" : "Show Original"}
          </button>
        </section>

        <article className="item-detail__article">
          <p className="item-detail__eyebrow">{item.type || "Unclassified"}</p>
          <h1>{item.nickname || "Clothing Item"}</h1>

          <div className="item-detail__notes card">
            <div className="item-detail__notes-label">Styling Notes</div>
            <p>{buildStylingNotes(item)}</p>
          </div>

          <dl className="item-detail__meta">
            {[
              ["Primary Color", item.primaryColor],
              ["Secondary Color", item.secondaryColor],
              ["Material", item.material],
              ["Fit", item.fit],
              ["Pattern", item.pattern],
              ["Weather", item.weatherSuitability?.replace("-", " ")],
              ["Formality", item.formality],
              ["Sleeve", item.sleeveLength],
              ["Neckline", item.neckline],
              ["Brand", item.brand],
              ["Condition", item.condition],
            ].map(([label, value]) => (
              <div key={label} className="item-detail__field">
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>

          <div className="item-detail__tags">
            <div className="item-detail__tags-label">Tags</div>
            <div className="item-detail__tag-row">
              {itemTags.map((tag) => (
                <span key={tag.id} className="badge badge-ghost item-detail__tag">
                  {tag.name}
                  <button type="button" onClick={() => handleRemoveTag(tag.id)}>
                    ×
                  </button>
                </span>
              ))}
              {itemTags.length === 0 && <span className="item-detail__muted">No custom tags yet.</span>}
            </div>
            <div className="item-detail__tag-form">
              <input
                className="input"
                placeholder="Add tag"
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddTag();
                  }
                }}
              />
              <button className="btn btn-outline" onClick={handleAddTag}>
                Add
              </button>
            </div>
          </div>

          <div className="item-detail__actions">
            {isEditing ? (
              <>
                <button className="btn btn-primary" onClick={handleSaveChanges}>
                  Save Changes
                </button>
                <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  Edit Metadata
                </button>
                <button className="btn btn-outline" onClick={markForReanalysis}>
                  Re-analyze
                </button>
                <button className="btn btn-outline" onClick={() => setModalMode("outfit")}>
                  Add to Outfit
                </button>
                <button className="btn btn-outline" onClick={() => setModalMode("wishlist")}>
                  Add to Wishlist
                </button>
                <button className="btn btn-ghost" onClick={handleDeleteItem}>
                  Delete
                </button>
              </>
            )}
          </div>

          {isEditing && (
            <div className="item-detail__editor card">
              <div className="item-detail__editor-grid">
                <label>
                  Nickname
                  <input className="input" value={nickname} onChange={(event) => setNickname(event.target.value)} />
                </label>
                <label>
                  Type
                  <input className="input" value={type} onChange={(event) => setType(event.target.value)} />
                </label>
                <label>
                  Color
                  <input className="input" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
                </label>
                <label>
                  Formality
                  <select className="input" value={formality} onChange={(event) => setFormality(event.target.value)}>
                    <option value="">Select</option>
                    <option value="casual">Casual</option>
                    <option value="smart-casual">Smart Casual</option>
                    <option value="formal">Formal</option>
                    <option value="festive">Festive</option>
                    <option value="loungewear">Loungewear</option>
                  </select>
                </label>
                <label>
                  Weather
                  <select className="input" value={weatherSuitability} onChange={(event) => setWeatherSuitability(event.target.value)}>
                    <option value="">Select</option>
                    <option value="warm-weather">Warm Weather</option>
                    <option value="cold-weather">Cold Weather</option>
                    <option value="all-season">All Season</option>
                  </select>
                </label>
                <label>
                  Material
                  <input className="input" value={material} onChange={(event) => setMaterial(event.target.value)} />
                </label>
                <label>
                  Pattern
                  <input className="input" value={pattern} onChange={(event) => setPattern(event.target.value)} />
                </label>
                <label>
                  Fit
                  <input className="input" value={fit} onChange={(event) => setFit(event.target.value)} />
                </label>
              </div>
            </div>
          )}
        </article>
      </div>

      <AnimatePresence>
        {modalMode && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalMode(null)}
          >
            <motion.div
              className="modal-panel card"
              initial={{ y: 10, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
            >
              <h3>{modalMode === "outfit" ? "Add to Outfit" : "Add to Wishlist"}</h3>
              <p>
                This phase keeps the workflow placeholder-only. The current item is ready for a future modal
                integration.
              </p>
              <button className="btn btn-primary" onClick={() => setModalMode(null)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
