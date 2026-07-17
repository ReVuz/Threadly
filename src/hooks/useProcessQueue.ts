import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/db";
import { clothes } from "../../drizzle/schema";
import { eq, isNull } from "drizzle-orm";
import { removeBackground } from "../lib/tauri";

export interface QueueItem {
  id: number;
  uuid: string;
  nickname: string | null;
  imageOriginal: string;
  status: "pending" | "processing" | "completed" | "failed";
  usedFallback?: boolean;
}

export function useProcessQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Fetch items that need background removal processing
  const refreshQueue = useCallback(async () => {
    try {
      const pendingItems = await db
        .select({
          id: clothes.id,
          uuid: clothes.uuid,
          nickname: clothes.nickname,
          imageOriginal: clothes.imageOriginal,
        })
        .from(clothes)
        .where(isNull(clothes.imageProcessed));

      setQueue(
        pendingItems.map((item) => ({
          ...item,
          status: "pending",
        }))
      );
    } catch (err) {
      console.error("Failed to load processing queue:", err);
    }
  }, []);

  // Run the processing queue sequentially
  useEffect(() => {
    if (isProcessing || queue.length === 0) return;

    const processNext = async () => {
      setIsProcessing(true);
      const nextItem = queue.find((item) => item.status === "pending");
      
      if (!nextItem) {
        setIsProcessing(false);
        return;
      }

      setCurrentId(nextItem.id);
      setQueue((prev) =>
        prev.map((item) => (item.id === nextItem.id ? { ...item, status: "processing" } : item))
      );

      try {
        // Extract extension from original path
        const ext = nextItem.imageOriginal.split(".").pop() || "png";
        
        // Call tauri background removal + thumbnail command
        const result = await removeBackground(nextItem.uuid, ext);

        // Update database row
        await db
          .update(clothes)
          .set({
            imageProcessed: result.processed_path,
            imageThumbnail: result.thumbnail_path,
          })
          .where(eq(clothes.id, nextItem.id));

        setQueue((prev) =>
          prev.map((item) =>
            item.id === nextItem.id
              ? { ...item, status: "completed", usedFallback: result.used_fallback }
              : item
          )
        );
      } catch (err) {
        console.error(`Failed to process background for item ${nextItem.id}:`, err);
        setQueue((prev) =>
          prev.map((item) => (item.id === nextItem.id ? { ...item, status: "failed" } : item))
        );
      } finally {
        setCurrentId(null);
        setIsProcessing(false);
      }
    };

    processNext();
  }, [queue, isProcessing]);

  // Triggered when new uploads complete
  const addToQueue = useCallback(() => {
    refreshQueue();
  }, [refreshQueue]);

  return {
    queue,
    isProcessing,
    currentId,
    addToQueue,
    refreshQueue,
  };
}
