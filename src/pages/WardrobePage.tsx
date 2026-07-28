import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { clothes } from "../../drizzle/schema";
import { db } from "../lib/db";
import { useWardrobe } from "../context/WardrobeContext";
import { eq } from "drizzle-orm";
import { itemMatchesSearch } from "../lib/search";
import { getRecentItems, type WardrobeItemSummary } from "../lib/editorial";
import UploadZone from "../components/upload/UploadZone";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "top", label: "Tops" },
  { key: "bottom", label: "Bottoms" },
  { key: "dress", label: "Dresses" },
  { key: "jacket", label: "Layers" },
  { key: "ethnic", label: "Ethnic" },
];

const COLOR_SWATCHES: Record<string, string> = {
  black: "#111111",
  white: "#f8f7f3",
  ivory: "#f3eadf",
  cream: "#efe2c7",
  beige: "#d8c3a5",
  brown: "#7d5638",
  navy: "#1f2a44",
  blue: "#59779b",
  green: "#708c5d",
  grey: "#8a8f98",
  gray: "#8a8f98",
  red: "#a33b3b",
  pink: "#d79aa8",
  yellow: "#d4b35f",
  gold: "#c6a75e",
};

type FilterKey = "all" | "top" | "bottom" | "dress" | "jacket" | "ethnic";

export default function WardrobePage() {
  const { activeWardrobeId } = useWardrobe();
  const [items, setItems] = useState<WardrobeItemSummary[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterKey>("all");
  const [activeColor, setActiveColor] = useState("all");
  const [activeFormality, setActiveFormality] = useState("all");
  const [activeWeather, setActiveWeather] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      try {
        setLoadingError(null);
        const rows = await db.select().from(clothes).where(eq(clothes.wardrobeId, activeWardrobeId));
        if (!cancelled) {
          setItems(rows as WardrobeItemSummary[]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setLoadingError(`Wardrobe grid failed to load items: ${message}`);
        }
      }
    }

    loadItems();
    return () => {
      cancelled = true;
    };
  }, [activeWardrobeId, reloadToken]);

  const colors = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.primaryColor).filter(Boolean))) as string[];
  }, [items]);

  const formalities = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.formality).filter(Boolean))) as string[];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const categoryMatch = activeCategory === "all" || item.type === activeCategory;
      const colorMatch = activeColor === "all" || item.primaryColor === activeColor;
      const formalityMatch = activeFormality === "all" || item.formality === activeFormality;
      const weatherMatch = activeWeather === "all" || item.weatherSuitability === activeWeather;
      const searchMatch = itemMatchesSearch(item, searchQuery);
      return categoryMatch && colorMatch && formalityMatch && weatherMatch && searchMatch;
    });
  }, [items, activeCategory, activeColor, activeFormality, activeWeather, searchQuery]);

  const recentItems = useMemo(() => getRecentItems(filteredItems, 2), [filteredItems]);

  const activeFilters = [
    activeCategory !== "all" ? { label: activeCategory, clear: () => setActiveCategory("all") } : null,
    activeColor !== "all" ? { label: activeColor, clear: () => setActiveColor("all") } : null,
    activeFormality !== "all" ? { label: activeFormality, clear: () => setActiveFormality("all") } : null,
    activeWeather !== "all" ? { label: activeWeather, clear: () => setActiveWeather("all") } : null,
    searchQuery ? { label: `"${searchQuery}"`, clear: () => setSearchQuery("") } : null,
  ].filter(Boolean) as Array<{ label: string; clear: () => void }>;

  const handleImportComplete = () => {
    setReloadToken((value) => value + 1);
  };

  return (
    <motion.main className="wardrobe-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <section className="wardrobe-upload card">
        <div className="wardrobe-upload__header">
          <div className="wardrobe-page__eyebrow">UPLOAD</div>
          <h2>Add clothing</h2>
          <p>Drop new pieces here. They will import, process, and re-index automatically.</p>
        </div>
        <UploadZone onImportComplete={handleImportComplete} />
      </section>

      <header className="wardrobe-page__header">
        <div>
          <div className="wardrobe-page__eyebrow">EDITORIAL GRID</div>
          <h1>The Wardrobe</h1>
        </div>
        <input
          className="input wardrobe-page__search"
          placeholder="Search color, type, material..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </header>

      {loadingError && <div className="page-error">{loadingError}</div>}

      {activeFilters.length > 0 && (
        <div className="wardrobe-page__chips">
          {activeFilters.map((chip) => (
            <button key={chip.label} className="filter-chip filter-chip--active" onClick={chip.clear}>
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      <div className="wardrobe-layout">
        <aside className="wardrobe-sidebar card">
          <div className="wardrobe-sidebar__section">
            <div className="wardrobe-sidebar__label">Categories</div>
            <div className="wardrobe-sidebar__links">
              <button className={activeCategory === "all" ? "filter-chip filter-chip--active" : "filter-chip"} onClick={() => setActiveCategory("all")}>
                All
              </button>
              {FILTERS.slice(1).map((filter) => (
                <button
                  key={filter.key}
                  className={activeCategory === filter.key ? "filter-chip filter-chip--active" : "filter-chip"}
                  onClick={() => setActiveCategory(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="wardrobe-sidebar__section">
            <div className="wardrobe-sidebar__label">Colors</div>
            <div className="wardrobe-sidebar__swatches">
              <button className={activeColor === "all" ? "swatch swatch--active" : "swatch"} onClick={() => setActiveColor("all")}>
                All
              </button>
              {colors.map((color) => (
                <button
                  key={color}
                  className={activeColor === color ? "swatch swatch--active" : "swatch"}
                  onClick={() => setActiveColor(color)}
                  title={color}
                  aria-label={color}
                >
                  <span className="swatch__dot" style={{ background: COLOR_SWATCHES[color.toLowerCase()] || color }} />
                </button>
              ))}
            </div>
          </div>

          <div className="wardrobe-sidebar__section">
            <div className="wardrobe-sidebar__label">Formality</div>
            <div className="wardrobe-sidebar__links">
              <button className={activeFormality === "all" ? "filter-chip filter-chip--active" : "filter-chip"} onClick={() => setActiveFormality("all")}>
                All
              </button>
              {formalities.map((formality) => (
                <button
                  key={formality}
                  className={activeFormality === formality ? "filter-chip filter-chip--active" : "filter-chip"}
                  onClick={() => setActiveFormality(formality)}
                >
                  {formality}
                </button>
              ))}
            </div>
          </div>

          <div className="wardrobe-sidebar__section">
            <div className="wardrobe-sidebar__label">Weather</div>
            <div className="wardrobe-sidebar__links">
              {["all", "warm-weather", "cold-weather", "all-season"].map((weather) => (
                <button
                  key={weather}
                  className={activeWeather === weather ? "filter-chip filter-chip--active" : "filter-chip"}
                  onClick={() => setActiveWeather(weather)}
                >
                  {weather === "all" ? "All" : weather.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="wardrobe-grid">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => {
              const isHero = index === 0 || (index === 1 && recentItems.some((recent) => recent.id === item.id));
              const imageSource = item.imageThumbnail || item.imageProcessed || item.imageOriginal || "";
              const imageUrl = convertFileSrc(imageSource);

              return (
                <motion.article
                  key={item.id}
                  layout
                  className={isHero ? "wardrobe-card wardrobe-card--hero card" : "wardrobe-card card"}
                  data-hero={isHero ? "true" : "false"}
                >
                  <Link to={`/wardrobe/${item.id}`} className="wardrobe-card__link">
                    <div className="wardrobe-card__media">
                      <img src={imageUrl} alt={item.nickname || "Wardrobe item"} />
                      <div className="wardrobe-card__shade" />
                    </div>
                    <div className="wardrobe-card__body">
                      <p className="wardrobe-card__name">{item.nickname || "Untitled piece"}</p>
                      <p className="wardrobe-card__meta">{item.type || "Unclassified"}</p>
                      <div className="wardrobe-card__facts">
                        {item.primaryColor && <span>{item.primaryColor}</span>}
                        {item.formality && <span>{item.formality}</span>}
                      </div>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <div className="empty-state wardrobe-grid__empty">
              <h3>No items match the current filters</h3>
              <p>Clear one chip above or add more garments to expand the editorial spread.</p>
            </div>
          )}
        </section>
      </div>
    </motion.main>
  );
}
