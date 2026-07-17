import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { importImage, type ImportImageResult } from "../../lib/tauri";
import { db } from "../../lib/db";
import { clothes } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

interface UploadZoneProps {
  onImportComplete?: (items: ImportImageResult[]) => void;
}

interface UploadingFile {
  path: string;
  name: string;
  status: "pending" | "importing" | "duplicate" | "completed" | "failed";
  error?: string;
  progress: number;
}

export default function UploadZone({ onImportComplete }: UploadZoneProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePickFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
      });

      if (!selected) return;

      const filePaths = Array.isArray(selected) ? selected : [selected];
      const newFiles = filePaths.map((filePath) => {
        // Extract filename from path
        const name = filePath.split("/").pop() || filePath;
        return {
          path: filePath,
          name,
          status: "pending" as const,
          progress: 0,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);
      processQueue([...files, ...newFiles]);
    } catch (err) {
      console.error("File selection failed:", err);
    }
  };

  const processQueue = async (queue: UploadingFile[]) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const completedImports: ImportImageResult[] = [];

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      if (file.status !== "pending") continue;

      // Update status to importing
      updateFileStatus(file.path, "importing", 30);

      try {
        // 1. Run tauri command to copy to originals and get checksum/dimensions
        const importResult = await importImage(file.path);
        updateFileStatus(file.path, "importing", 70);

        // 2. Check duplicate in database using checksum
        const existing = await db
          .select()
          .from(clothes)
          .where(eq(clothes.checksum, importResult.checksum));

        if (existing.length > 0) {
          updateFileStatus(file.path, "duplicate", 100, "Already in wardrobe");
          continue;
        }

        // 3. Insert new row in clothes table
        await db.insert(clothes).values({
          wardrobeId: 1, // Default wardrobe
          uuid: importResult.uuid,
          nickname: file.name.split(".")[0],
          imageOriginal: importResult.original_path,
          width: importResult.width,
          height: importResult.height,
          fileSize: importResult.file_size,
          checksum: importResult.checksum,
          aiStatus: "PENDING",
        });

        updateFileStatus(file.path, "completed", 100);
        completedImports.push(importResult);
      } catch (err: any) {
        console.error("Import failed for " + file.name, err);
        updateFileStatus(file.path, "failed", 100, err.message || "Import failed");
      }
    }

    setIsProcessing(false);
    if (completedImports.length > 0 && onImportComplete) {
      onImportComplete(completedImports);
    }
  };

  const updateFileStatus = (
    path: string,
    status: UploadingFile["status"],
    progress: number,
    error?: string
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, status, progress, error } : f))
    );
  };

  const clearQueue = () => {
    if (isProcessing) return;
    setFiles([]);
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto" }}>
      {/* Drop Zone Box */}
      <motion.div
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onClick={handlePickFiles}
        style={{
          border: "2px dashed var(--border)",
          borderRadius: "var(--card-radius)",
          background: "var(--surface)",
          padding: "54px 40px",
          textAlign: "center",
          cursor: "pointer",
          boxShadow: "var(--shadow-sm)",
          transition: "border-color var(--duration-base) var(--ease-out)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)";
          e.currentTarget.style.background = "rgba(198, 167, 94, 0.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "var(--surface)";
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 500,
            marginBottom: 8,
            color: "var(--primary)",
          }}
        >
          Add Clothing Items
        </h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            maxWidth: "320px",
            margin: "0 auto",
            lineHeight: 1.5,
          }}
        >
          Click to choose photos from your device. Background removal and AI tagging will run
          automatically.
        </p>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ marginTop: 24 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Queue ({files.filter((f) => f.status === "completed").length}/{files.length} done)
              </span>
              {!isProcessing && (
                <button className="btn btn-ghost btn-sm" onClick={clearQueue}>
                  Clear Queue
                </button>
              )}
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--card-radius)",
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {files.map((file, idx) => (
                <div
                  key={file.path}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: idx < files.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <div style={{ flex: 1, marginRight: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "var(--text)",
                          wordBreak: "break-all",
                        }}
                      >
                        {file.name}
                      </span>
                      {file.status === "duplicate" && (
                        <span className="badge badge-accent">Duplicate</span>
                      )}
                      {file.status === "failed" && (
                        <span
                          className="badge"
                          style={{ background: "var(--error-bg)", color: "var(--error)" }}
                        >
                          Error
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {file.status === "importing" && (
                      <div
                        style={{
                          height: 3,
                          background: "var(--surface-raised)",
                          borderRadius: 2,
                          overflow: "hidden",
                          marginTop: 6,
                        }}
                      >
                        <motion.div
                          animate={{ width: `${file.progress}%` }}
                          style={{
                            height: "100%",
                            background: "var(--accent)",
                          }}
                        />
                      </div>
                    )}

                    {file.error && (
                      <p
                        style={{
                          color: "var(--error)",
                          fontSize: "0.75rem",
                          marginTop: 2,
                        }}
                      >
                        {file.error}
                      </p>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {file.status === "completed" && (
                      <span className="badge badge-success">Imported</span>
                    )}
                    {file.status === "importing" && (
                      <span className="status-dot status-processing" />
                    )}
                    {file.status === "pending" && (
                      <span className="status-dot status-pending" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
