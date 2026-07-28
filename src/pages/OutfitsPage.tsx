import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { eq } from "drizzle-orm";
import { clothes, outfits, outfitItems } from "../../drizzle/schema";
import { db, initDb } from "../lib/db";
import { useWardrobe } from "../context/WardrobeContext";
import { buildOutfitSuggestion, summarizeOutfitItems, type OutfitSuggestion } from "../lib/outfitBuilder";
import type { WardrobeItemSummary } from "../lib/editorial";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

interface OutfitRecord {
  id: number;
  name: string;
  occasion: string | null;
  rating: number | null;
  favorite: number | null;
  notes: string | null;
  itemIds: number[];
}

export default function OutfitsPage() {
  const { activeWardrobeId } = useWardrobe();
  const [items, setItems] = useState<WardrobeItemSummary[]>([]);
  const [outfitRecords, setOutfitRecords] = useState<OutfitRecord[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [outfitName, setOutfitName] = useState("");
  const [occasion, setOccasion] = useState("casual");
  const [rating, setRating] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [notes, setNotes] = useState("");
  const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoadingError(null);

      const itemRows = await db.select().from(clothes).where(eq(clothes.wardrobeId, activeWardrobeId));
      const outfitRows = await db.select().from(outfits).where(eq(outfits.wardrobeId, activeWardrobeId));
      const relationRows = await db
        .select({
          outfitId: outfitItems.outfitId,
          clothId: outfitItems.clothId,
        })
        .from(outfitItems)
        .innerJoin(outfits, eq(outfitItems.outfitId, outfits.id))
        .where(eq(outfits.wardrobeId, activeWardrobeId));

      const grouped = relationRows.reduce<Record<number, number[]>>((acc, row) => {
        acc[row.outfitId] ??= [];
        acc[row.outfitId].push(row.clothId);
        return acc;
      }, {});

      setItems(itemRows as WardrobeItemSummary[]);
      setOutfitRecords(
        outfitRows.map((row) => ({
          id: row.id,
          name: row.name,
          occasion: row.occasion,
          rating: row.rating,
          favorite: row.favorite,
          notes: row.notes,
          itemIds: grouped[row.id] || [],
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Outfits failed to load: ${message}`);
    }
  }, [activeWardrobeId]);

  useEffect(() => {
    // Initial data hydration needs to update component state after the async query resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );

  const savedOutfitLookup = useMemo(
    () =>
      outfitRecords.map((record) => ({
        ...record,
        items: record.itemIds
          .map((itemId) => items.find((item) => item.id === itemId))
          .filter((item): item is WardrobeItemSummary => Boolean(item)),
      })),
    [outfitRecords, items]
  );

  const selectedSummary = useMemo(() => summarizeOutfitItems(selectedItems), [selectedItems]);

  const handleToggleItem = (itemId: number) => {
    setSelectedItemIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    );
  };

  const handleSuggest = () => {
    const nextSuggestion = buildOutfitSuggestion(items);
    if (!nextSuggestion) {
      setLoadingError("No valid outfit combination could be found for the current wardrobe.");
      return;
    }

    setSuggestion(nextSuggestion);
    setSelectedItemIds(nextSuggestion.itemIds);
    setOutfitName(nextSuggestion.title);
    setNotes(nextSuggestion.reasoning);
  };

  const handleCreateOutfit = async () => {
    if (selectedItemIds.length === 0) {
      setLoadingError("Pick at least one garment before saving an outfit.");
      return;
    }

    try {
      const conn = await initDb();
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      const result = await conn.execute(
        `INSERT INTO outfits
          (wardrobe_id, name, occasion, rating, favorite, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          activeWardrobeId,
          outfitName.trim() || suggestion?.title || "New Outfit",
          occasion || null,
          rating,
          favorite ? 1 : 0,
          notes || null,
          now,
          now,
        ]
      );

      const outfitId = Number((result as { lastInsertId?: number }).lastInsertId || 0);
      if (!outfitId) {
        throw new Error("Unable to determine inserted outfit id.");
      }

      for (const clothId of selectedItemIds) {
        await conn.execute(
          "INSERT INTO outfit_items (outfit_id, cloth_id) VALUES (?, ?)",
          [outfitId, clothId]
        );
      }

      setSelectedItemIds([]);
      setOutfitName("");
      setNotes("");
      setFavorite(false);
      setRating(0);
      setSuggestion(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to create outfit: ${message}`);
    }
  };

  const handleToggleFavorite = async (outfitId: number, currentValue: number | null) => {
    try {
      const conn = await initDb();
      const nextValue = currentValue ? 0 : 1;
      await conn.execute(
        "UPDATE outfits SET favorite = ?, updated_at = ? WHERE id = ?",
        [nextValue, new Date().toISOString().replace("T", " ").slice(0, 19), outfitId]
      );
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to update favorite state: ${message}`);
    }
  };

  const handleRatingChange = async (outfitId: number, nextRating: number) => {
    try {
      const conn = await initDb();
      await conn.execute("UPDATE outfits SET rating = ?, updated_at = ? WHERE id = ?", [
        nextRating,
        new Date().toISOString().replace("T", " ").slice(0, 19),
        outfitId,
      ]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to update rating: ${message}`);
    }
  };

  const handleDeleteOutfit = async (outfitId: number) => {
    try {
      const conn = await initDb();
      await conn.execute("DELETE FROM outfits WHERE id = ?", [outfitId]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadingError(`Failed to delete outfit: ${message}`);
    }
  };

  return (
    <motion.main className="outfits-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <section className="outfits-hero">
        <div className="outfits-hero__eyebrow">OUTFIT BUILDER</div>
        <h1>Compose a look</h1>
        <p>Assemble garments into saved outfits, or use the local compatibility preview to get a strong starting point.</p>
      </section>

      {loadingError && <div className="page-error">{loadingError}</div>}

      <section className="outfits-builder card">
        <div className="outfits-builder__topline">
          <div>
            <h2>Board</h2>
            <p>{selectedItemIds.length > 0 ? selectedSummary : "Select garments from the wardrobe to build a board."}</p>
          </div>
          <div className="outfits-builder__actions">
            <button type="button" className="btn btn-outline" onClick={handleSuggest}>
              Suggest with AI
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateOutfit}>
              Save Outfit
            </button>
          </div>
        </div>

        <div className="outfits-builder__form">
          <label>
            Outfit name
            <input className="input" value={outfitName} onChange={(event) => setOutfitName(event.target.value)} placeholder="Weekend Edit" />
          </label>
          <label>
            Occasion
            <input className="input" value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="casual" />
          </label>
          <label>
            Rating
            <select className="input" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? "Unrated" : `${value} Star${value === 1 ? "" : "s"}`}
                </option>
              ))}
            </select>
          </label>
          <label className="outfits-builder__favorite">
            <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />
            Favorite
          </label>
          <label className="outfits-builder__notes">
            Notes
            <textarea className="input" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Style reasoning or occasion notes." />
          </label>
        </div>

        {suggestion && (
          <div className="outfits-builder__suggestion">
            <div className="outfits-builder__suggestion-label">Compatibility preview</div>
            <h3>{suggestion.title}</h3>
            <p>{suggestion.reasoning}</p>
          </div>
        )}

        <div className="outfits-board">
          <AnimatePresence mode="popLayout">
            {selectedItems.map((item) => (
              <motion.button
                key={item.id}
                layout
                type="button"
                className="outfit-slot card"
                onClick={() => handleToggleItem(item.id)}
              >
                <img src={convertFileSrc(item.imageThumbnail || item.imageProcessed || item.imageOriginal || "")} alt={item.nickname || "Wardrobe item"} />
                <div className="outfit-slot__meta">
                  <span>{item.nickname || "Untitled piece"}</span>
                  <small>{item.type || "Unclassified"}</small>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {selectedItems.length === 0 && (
            <div className="outfits-board__empty">
              Choose one dress or a top and bottom pair to begin.
            </div>
          )}
        </div>
      </section>

      <section className="outfits-library">
        <div className="outfits-section__label">Wardrobe Items</div>
        <div className="outfits-library__grid">
          {items.map((item) => {
            const selected = selectedItemIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={selected ? "outfit-pick card outfit-pick--active" : "outfit-pick card"}
                onClick={() => handleToggleItem(item.id)}
              >
                <img src={convertFileSrc(item.imageThumbnail || item.imageProcessed || item.imageOriginal || "")} alt={item.nickname || "Wardrobe item"} />
                <div className="outfit-pick__meta">
                  <strong>{item.nickname || "Untitled piece"}</strong>
                  <span>{item.type || "Unclassified"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="outfits-saved">
        <div className="outfits-section__label">Saved Outfits</div>
        <div className="outfits-saved__list">
          {savedOutfitLookup.map((outfit) => (
            <article key={outfit.id} className="outfit-card card">
              <div className="outfit-card__header">
                <div>
                  <h3>{outfit.name}</h3>
                  <p>{outfit.occasion || "No occasion set"}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-pressed={Boolean(outfit.favorite)}
                  onClick={() => handleToggleFavorite(outfit.id, outfit.favorite)}
                >
                  {outfit.favorite ? "Unfavorite" : "Favorite"}
                </button>
              </div>

              <div className="outfit-card__board">
                {outfit.items.map((item) => (
                  <div key={item.id} className="outfit-card__thumb">
                    <img src={convertFileSrc(item.imageThumbnail || item.imageProcessed || item.imageOriginal || "")} alt={item.nickname || "Wardrobe item"} />
                  </div>
                ))}
              </div>

              <div className="outfit-card__rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={star <= (outfit.rating || 0) ? "outfit-star outfit-star--active" : "outfit-star"}
                    aria-label={`Rate ${outfit.name} ${star} star${star === 1 ? "" : "s"}`}
                    onClick={() => void handleRatingChange(outfit.id, star)}
                  >
                    ★
                  </button>
                ))}
              </div>

              {outfit.notes && <p className="outfit-card__notes">{outfit.notes}</p>}

              <div className="outfit-card__actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDeleteOutfit(outfit.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}

          {savedOutfitLookup.length === 0 && <div className="outfits-saved__empty">No outfits saved yet.</div>}
        </div>
      </section>
    </motion.main>
  );
}
