import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/db";
import { clothes, tags, clothTags } from "../../drizzle/schema";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import { useQueue } from "../context/QueueContext";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

interface ClothingItem {
  id: number;
  uuid: string;
  nickname: string | null;
  type: string | null;
  primaryColor: string | null;
  formality: string | null;
  weatherSuitability: string | null;
  imageOriginal: string;
  imageProcessed: string | null;
  imageThumbnail: string | null;
  aiStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

export default function WardrobePage() {
  const { isProcessing, isAnalyzing } = useQueue();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeColor, setActiveColor] = useState<string>("all");
  const [activeFormality, setActiveFormality] = useState<string>("all");
  const [activeWeather, setActiveWeather] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchItems = async () => {
    try {
      const data = await db.select().from(clothes);
      setItems(data as ClothingItem[]);
    } catch (err) {
      console.error("Failed to load clothes:", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [isProcessing, isAnalyzing]);

  // Extract unique filter options
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.type) set.add(item.type);
    });
    return ["all", ...Array.from(set)];
  }, [items]);

  const colors = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.primaryColor) set.add(item.primaryColor);
    });
    return ["all", ...Array.from(set)];
  }, [items]);

  const formalities = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.formality) set.add(item.formality);
    });
    return ["all", ...Array.from(set)];
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.type === activeCategory;
      const matchesColor = activeColor === "all" || item.primaryColor === activeColor;
      const matchesFormality = activeFormality === "all" || item.formality === activeFormality;
      const matchesWeather = activeWeather === "all" || item.weatherSuitability === activeWeather;
      
      const nicknameLower = (item.nickname || "").toLowerCase();
      const typeLower = (item.type || "").toLowerCase();
      const colorLower = (item.primaryColor || "").toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        nicknameLower.includes(searchQuery.toLowerCase()) ||
        typeLower.includes(searchQuery.toLowerCase()) ||
        colorLower.includes(searchQuery.toLowerCase());

      return matchesCategory && matchesColor && matchesFormality && matchesWeather && matchesSearch;
    });
  }, [items, activeCategory, activeColor, activeFormality, activeWeather, searchQuery]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ padding: "48px 48px", minHeight: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}
    >
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "36px" }}>
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
            COLLECTION
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", fontWeight: 500, color: "var(--primary)" }}>
            The Wardrobe Grid
          </h1>
        </div>
        
        {/* Search Input */}
        <div style={{ width: "240px" }}>
          <input
            type="text"
            className="input"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "32px",
        }}
      >
        {/* Category Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
            Category
          </span>
          <select
            className="input"
            style={{ width: "140px", padding: "6px 12px" }}
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Color Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
            Color
          </span>
          <select
            className="input"
            style={{ width: "140px", padding: "6px 12px" }}
            value={activeColor}
            onChange={(e) => setActiveColor(e.target.value)}
          >
            {colors.map((col) => (
              <option key={col} value={col}>
                {col === "all" ? "All Colors" : col}
              </option>
            ))}
          </select>
        </div>

        {/* Formality Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
            Formality
          </span>
          <select
            className="input"
            style={{ width: "140px", padding: "6px 12px" }}
            value={activeFormality}
            onChange={(e) => setActiveFormality(e.target.value)}
          >
            {formalities.map((form) => (
              <option key={form} value={form}>
                {form === "all" ? "All Occasions" : form}
              </option>
            ))}
          </select>
        </div>

        {/* Weather Suitability Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
            Weather
          </span>
          <select
            className="input"
            style={{ width: "140px", padding: "6px 12px" }}
            value={activeWeather}
            onChange={(e) => setActiveWeather(e.target.value)}
          >
            <option value="all">All Seasons</option>
            <option value="warm-weather">Warm Weather</option>
            <option value="cold-weather">Cold Weather</option>
            <option value="all-season">All Season</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <h3>No items found</h3>
          <p>Try resetting your filters or add new clothing items to start curating.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "28px",
          }}
        >
          <AnimatePresence>
            {filteredItems.map((item) => {
              // Convert native file system path to WebView-compatible URL
              const imgUrl = convertFileSrc(item.imageThumbnail || item.imageOriginal);
              
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="card"
                  style={{
                    background: "var(--surface)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Link to={`/wardrobe/${item.id}`} style={{ textDecoration: "none", color: "inherit", flex: 1, display: "flex", flexDirection: "column" }}>
                    {/* Image frame */}
                    <div
                      style={{
                        position: "relative",
                        paddingBottom: "125%", // 4:5 aspect ratio
                        background: "var(--surface-raised)",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={item.nickname || "Clothing Item"}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform var(--duration-slow) var(--ease-out)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      />

                      {/* AI Status Badge */}
                      {item.aiStatus !== "COMPLETED" && (
                        <div
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            background: "rgba(255, 255, 255, 0.85)",
                            backdropFilter: "blur(4px)",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            color: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span className="status-dot status-processing" style={{ width: 6, height: 6 }} />
                          {item.aiStatus}
                        </div>
                      )}
                    </div>

                    {/* Metadata Card */}
                    <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h3
                          style={{
                            fontSize: "1rem",
                            fontWeight: 500,
                            color: "var(--text)",
                            fontFamily: "var(--font-body)",
                            marginBottom: 4,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.nickname || "Clothing Item"}
                        </h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "capitalize" }}>
                          {item.type || "Unclassified"}
                        </p>
                      </div>

                      {/* Tiny category metadata list */}
                      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                        {item.primaryColor && (
                          <span className="badge badge-ghost" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                            {item.primaryColor}
                          </span>
                        )}
                        {item.formality && (
                          <span className="badge badge-ghost" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                            {item.formality}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
