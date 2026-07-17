import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/db";
import { clothes } from "../../drizzle/schema";
import { generateGapAnalysis, type GapAnalysisResponse } from "../lib/gemini";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function DiscoverPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GapAnalysisResponse | null>(null);
  const [hasClothes, setHasClothes] = useState(false);

  const checkAndRunAnalysis = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const allClothes = await db.select().from(clothes);
      if (allClothes.length === 0) {
        setHasClothes(false);
        setLoading(false);
        return;
      }
      setHasClothes(true);

      // Check if we already have a cached analysis in localStorage to save Gemini API credits/limit usage
      const cached = localStorage.getItem("threadly_gap_analysis");
      if (cached && !force) {
        setAnalysis(JSON.parse(cached));
        setLoading(false);
        return;
      }

      // Convert wardrobe items into a simplified list for Gemini
      const clothesSummary = allClothes.map((item) => ({
        type: item.type,
        primaryColor: item.primaryColor,
        formality: item.formality,
        material: item.material,
        pattern: item.pattern,
      }));

      const report = await generateGapAnalysis(clothesSummary);
      setAnalysis(report);
      localStorage.setItem("threadly_gap_analysis", JSON.stringify(report));
    } catch (err: any) {
      console.error("Gap analysis failed:", err);
      setError(err.message || "Failed to generate AI Gap Analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAndRunAnalysis();
  }, []);

  const handleRegenerate = () => {
    checkAndRunAnalysis(true);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const normalized = Math.min(5, Math.max(0, Math.round(rating)));
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            color: i <= normalized ? "var(--accent)" : "var(--border)",
            fontSize: "1.2rem",
            marginRight: "2px",
          }}
        >
          {i <= normalized ? "★" : "☆"}
        </span>
      );
    }
    return stars;
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ padding: "48px 48px", minHeight: "100%", overflowY: "auto" }}
    >
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
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
            AI ASSISTANT
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", fontWeight: 500, color: "var(--primary)" }}>
            Wardrobe Gap Analysis
          </h1>
        </div>

        {hasClothes && !loading && (
          <button className="btn btn-outline btn-sm" onClick={handleRegenerate}>
            Refresh Analysis
          </button>
        )}
      </div>

      {!hasClothes ? (
        <div className="empty-state">
          <h3>No items to analyze</h3>
          <p>Please upload some clothing items first so the AI can analyze your wardrobe coverage.</p>
        </div>
      ) : loading ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <span className="status-dot status-processing" style={{ width: 16, height: 16, display: "inline-block", marginBottom: 16 }} />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 500 }}>
            Analyzing wardrobe matrix...
          </h3>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", marginTop: 8 }}>
            Running color balance algorithms, occasion mapping, and outfit potential predictions.
          </p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <h3 style={{ color: "var(--error)" }}>Analysis Failed</h3>
          <p>{error}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleRegenerate}>
            Retry Analysis
          </button>
        </div>
      ) : analysis ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" }}>
          
          {/* Left Column: Color & Occasion */}
          <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
            
            {/* Color Balance widget */}
            <div className="card" style={{ padding: "28px", background: "var(--surface)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, marginBottom: "16px", color: "var(--primary)" }}>
                Color Balance
              </h3>
              
              {/* Stacked color bar */}
              <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 20, background: "var(--border-subtle)" }}>
                {analysis.colorBalance.map((item, idx) => (
                  <div
                    key={item.color}
                    style={{
                      width: `${item.percentage}%`,
                      // Map common color names to CSS colors, fallback to grey
                      background: item.color.toLowerCase() === "white"
                        ? "#f8f9fa"
                        : item.color.toLowerCase() === "black"
                        ? "#212529"
                        : item.color.toLowerCase() === "blue"
                        ? "#2b6cb0"
                        : item.color.toLowerCase() === "grey" || item.color.toLowerCase() === "gray"
                        ? "#718096"
                        : item.color.toLowerCase() === "red"
                        ? "#c53030"
                        : "var(--accent)",
                      borderRight: idx < analysis.colorBalance.length - 1 ? "1px solid #fff" : "none",
                    }}
                    title={`${item.color}: ${item.percentage}%`}
                  />
                ))}
              </div>

              {/* Color List grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                {analysis.colorBalance.map((item) => (
                  <div key={item.color} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        background: item.color.toLowerCase() === "white"
                          ? "#fff"
                          : item.color.toLowerCase() === "black"
                          ? "#000"
                          : item.color.toLowerCase() === "blue"
                          ? "#2b6cb0"
                          : item.color.toLowerCase() === "grey" || item.color.toLowerCase() === "gray"
                          ? "#718096"
                          : item.color.toLowerCase() === "red"
                          ? "#c53030"
                          : "var(--accent)",
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", textTransform: "capitalize", color: "var(--text)" }}>
                      {item.color}: <strong>{item.percentage}%</strong>
                    </span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
                {analysis.colorFeedback}
              </p>
            </div>

            {/* Occasion Coverage widget */}
            <div className="card" style={{ padding: "28px", background: "var(--surface)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, marginBottom: "16px", color: "var(--primary)" }}>
                Occasion Coverage
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                {analysis.occasions.map((occ) => (
                  <div key={occ.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.875rem", textTransform: "capitalize", fontWeight: 500 }}>
                      {occ.name}
                    </span>
                    <div>{renderStars(occ.rating)}</div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
                {analysis.occasionFeedback}
              </p>
            </div>

          </div>

          {/* Right Column: Missing Essentials & Outfit potential */}
          <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
            
            {/* Missing Essentials */}
            <div className="card" style={{ padding: "28px", background: "var(--surface)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, marginBottom: "16px", color: "var(--primary)" }}>
                Missing Essentials
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {analysis.missingEssentials.map((ess) => (
                  <div
                    key={ess.item}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "var(--surface-raised)",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: "0.875rem", fontWeight: 500, textTransform: "capitalize" }}>
                      {ess.item}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Owned: <strong>{ess.owned}</strong> &bull; Recommended: <strong>{ess.recommended}</strong>
                    </span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
                {analysis.essentialsFeedback}
              </p>
            </div>

            {/* Outfit Potential */}
            <div className="card" style={{ padding: "28px", background: "var(--surface-raised)", borderColor: "var(--accent)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, marginBottom: "12px", color: "var(--primary)" }}>
                Outfit Potential
              </h3>
              <p style={{ fontSize: "0.9375rem", color: "var(--text)", lineHeight: 1.6, fontWeight: 500, marginBottom: "12px" }}>
                {analysis.outfitUnlockEstimate}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Instead of suggesting clothes individually, Threadly estimates how many new outfit combinations are unlocked with your existing items when you add recommended essentials.
              </p>
            </div>

          </div>

        </div>
      ) : null}
    </motion.div>
  );
}
