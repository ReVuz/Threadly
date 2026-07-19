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
      console.info(`[Threadly] Background queue loaded ${pendingItems.length} pending item(s)`);
    } catch (err) {
      console.error("Failed to load processing queue:", err);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshQueue();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshQueue]);

  // Run the processing queue sequentially
  useEffect(() => {
    const pendingItems = queue.filter((item) => item.status === "pending");
    if (isProcessing || pendingItems.length === 0) return;

    const processPendingItems = async () => {
      setIsProcessing(true);
      try {
        for (const nextItem of pendingItems) {
          console.info(`[Threadly] Removing background for item ${nextItem.id}`);
          setCurrentId(nextItem.id);
          setQueue((prev) =>
            prev.map((item) => (item.id === nextItem.id ? { ...item, status: "processing" } : item))
          );

          try {
            const ext = nextItem.imageOriginal.split(".").pop() || "png";
            const result = await removeBackground(nextItem.uuid, ext);
            console.info(`[Threadly] Background removal finished for item ${nextItem.id}`, result);

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
          }
        }
      } finally {
        setCurrentId(null);
        setIsProcessing(false);
      }
    };

    processPendingItems();
  }, [queue, isProcessing, refreshQueue]);

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
