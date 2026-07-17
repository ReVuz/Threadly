import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import UploadZone from "../components/upload/UploadZone";
import { useQueue } from "../context/QueueContext";
import { db } from "../lib/db";
import { clothes } from "../../drizzle/schema";
import { Link } from "react-router-dom";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

interface Stats {
  total: number;
  tops: number;
  bottoms: number;
  dresses: number;
  jackets: number;
  others: number;
}

export default function HomePage() {
  const { addToQueue, isProcessing, isAnalyzing } = useQueue();
  const [stats, setStats] = useState<Stats>({ total: 0, tops: 0, bottoms: 0, dresses: 0, jackets: 0, others: 0 });

  const fetchStats = async () => {
    try {
      const allClothes = await db.select().from(clothes);
      const newStats = { total: allClothes.length, tops: 0, bottoms: 0, dresses: 0, jackets: 0, others: 0 };
      
      allClothes.forEach((item) => {
        const type = item.type?.toLowerCase();
        if (type === "top") newStats.tops++;
        else if (type === "bottom") newStats.bottoms++;
        else if (type === "dress") newStats.dresses++;
        else if (type === "jacket") newStats.jackets++;
        else newStats.others++;
      });
      setStats(newStats);
    } catch (err) {
      console.error("Failed to fetch wardrobe stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [isProcessing, isAnalyzing]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ padding: "48px 48px", minHeight: "100%", overflowY: "auto" }}
    >
      {/* Editorial Header */}
      <div style={{ marginBottom: "48px" }}>
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
          WARDROBE MANAGER
        </span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "3.5rem",
            fontWeight: 400,
            lineHeight: 1.1,
            color: "var(--primary)",
            maxWidth: "600px",
          }}
        >
          Curate Your Style, Effortlessly.
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "1.05rem",
            marginTop: "16px",
            maxWidth: "480px",
            lineHeight: 1.6,
          }}
        >
          Threadly organizes your wardrobe using AI background removal and smart attribute tagging to unlock your outfit potential.
        </p>
      </div>

      {/* Stats Dashboard Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "20px",
          marginBottom: "54px",
        }}
      >
        <div className="card" style={{ padding: "24px", background: "var(--surface)" }}>
          <h4 style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Total Items
          </h4>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--primary)", fontWeight: 500 }}>
            {stats.total}
          </p>
        </div>

        <div className="card" style={{ padding: "24px", background: "var(--surface)" }}>
          <h4 style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Tops & Shirts
          </h4>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--primary)", fontWeight: 500 }}>
            {stats.tops}
          </p>
        </div>

        <div className="card" style={{ padding: "24px", background: "var(--surface)" }}>
          <h4 style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Bottoms & Pants
          </h4>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--primary)", fontWeight: 500 }}>
            {stats.bottoms}
          </p>
        </div>

        <div className="card" style={{ padding: "24px", background: "var(--surface)" }}>
          <h4 style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Dresses & Coats
          </h4>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--primary)", fontWeight: 500 }}>
            {stats.dresses + stats.jackets}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "40px", alignItems: "start" }}>
        {/* Upload Zone Section */}
        <div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.75rem",
              fontWeight: 500,
              marginBottom: "20px",
              color: "var(--primary)",
            }}
          >
            Import Clothes
          </h3>
          <UploadZone onImportComplete={addToQueue} />
        </div>

        {/* Quick Actions Panel */}
        <div
          className="card"
          style={{
            padding: "24px",
            background: "var(--surface-raised)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--primary)",
            }}
          >
            Quick Curate
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Link to="/wardrobe" className="btn btn-outline" style={{ justifyContent: "flex-start", width: "100%" }}>
              Explore Wardrobe
            </Link>
            <Link to="/outfits" className="btn btn-outline" style={{ justifyContent: "flex-start", width: "100%" }}>
              Create Outfits
            </Link>
            <Link to="/discover" className="btn btn-primary" style={{ justifyContent: "flex-start", width: "100%" }}>
              AI Wardrobe Analysis
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
