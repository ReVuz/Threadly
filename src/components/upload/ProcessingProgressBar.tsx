import { motion, AnimatePresence } from "framer-motion";
import type { QueueItem } from "../../hooks/useProcessQueue";

interface ProcessingProgressBarProps {
  queue: QueueItem[];
  isProcessing: boolean;
}

export default function ProcessingProgressBar({ queue, isProcessing }: ProcessingProgressBarProps) {
  const pendingCount = queue.filter((item) => item.status === "pending" || item.status === "processing").length;
  const totalCount = queue.length;
  
  if (totalCount === 0 || pendingCount === 0) return null;

  const completedCount = totalCount - pendingCount;
  const percentage = Math.round((completedCount / totalCount) * 100);

  // Check if any completed item used the fallback (meaning rembg is missing)
  const hasFallbackWarning = queue.some((item) => item.status === "completed" && item.usedFallback === true);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", damping: 20 }}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 100,
          width: "360px",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--border)",
          borderRadius: "var(--card-radius)",
          padding: "16px 20px",
          boxShadow: "var(--shadow-lg)",
          color: "var(--text)",
        }}
        className="dark:bg-slate-900/90 dark:border-slate-800"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="status-dot status-processing" />
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.1rem" }}>
              Processing Wardrobe
            </h4>
          </div>
          <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
            {completedCount} / {totalCount} ({percentage}%)
          </span>
        </div>

        {/* Progress Bar Container */}
        <div style={{ height: 4, background: "var(--border-subtle)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
          <motion.div
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ height: "100%", background: "var(--accent)" }}
          />
        </div>

        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
          {isProcessing ? "Removing background & optimizing WebP assets..." : "Idle..."}
        </p>

        {/* Fallback Warning Box */}
        {hasFallbackWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "var(--warning-bg)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>AI Background Removal Off:</strong> Install `rembg` on your system to enable background extraction (run: <code>pip install rembg</code>).
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
