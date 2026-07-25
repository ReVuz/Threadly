import { useState, useEffect, useCallback } from "react";
import { db, syncFts } from "../lib/db";
import { clothes, tags, clothTags, seasons, clothSeasons } from "../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { analyzeClothingImage } from "../lib/gemini";

export interface AnalysisQueueItem {
  id: number;
  nickname: string | null;
  imageProcessed: string;
  aiStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

export function useGeminiAnalysis() {
  const [queue, setQueue] = useState<AnalysisQueueItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const refreshAnalysisQueue = useCallback(async () => {
    try {
      // Recover work abandoned by an app restart while Gemini was running.
      await db
        .update(clothes)
        .set({ aiStatus: "PENDING" })
        .where(eq(clothes.aiStatus, "PROCESSING"));

      const items = await db
        .select({
          id: clothes.id,
          nickname: clothes.nickname,
          imageProcessed: clothes.imageProcessed,
          aiStatus: clothes.aiStatus,
        })
        .from(clothes)
        .where(
          and(
            isNotNull(clothes.imageProcessed),
            eq(clothes.aiStatus, "PENDING")
          )
        );

      setQueue(items as AnalysisQueueItem[]);
    } catch (err) {
      console.error("Failed to load Gemini analysis queue:", err);
    }
  }, []);

  useEffect(() => {
    if (isAnalyzing || queue.length === 0) return;

    const analyzeNext = async () => {
      setIsAnalyzing(true);
      const nextItem = queue.find((item) => item.aiStatus === "PENDING");
      
      if (!nextItem || !nextItem.imageProcessed) {
        setIsAnalyzing(false);
        return;
      }

      const itemId = nextItem.id;
      setActiveId(itemId);

      // Update state to PROCESSING
      setQueue((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, aiStatus: "PROCESSING" } : item))
      );

      // Update database status to PROCESSING
      await db
        .update(clothes)
        .set({ aiStatus: "PROCESSING" })
        .where(eq(clothes.id, itemId));

      try {
        const analysisResult = await analyzeClothingImage(nextItem.imageProcessed);

        // 1. Update clothing record
        await db
          .update(clothes)
          .set({
            type: analysisResult.type,
            primaryColor: analysisResult.primaryColor,
            secondaryColor: analysisResult.secondaryColor || null,
            pattern: analysisResult.pattern || null,
            material: analysisResult.material || null,
            fit: analysisResult.fit || null,
            formality: analysisResult.formality,
            sleeveLength: analysisResult.sleeveLength || null,
            neckline: analysisResult.neckline || null,
            weatherSuitability: analysisResult.weatherSuitability,
            nickname: analysisResult.suggestedName, // update nickname to the premium suggested name
            aiStatus: "COMPLETED",
            aiAnalyzedAt: new Date().toISOString(),
            aiRawJson: JSON.stringify(analysisResult),
          })
          .where(eq(clothes.id, itemId));

        // 2. Associate seasons automatically
        const seasonNames: string[] = [];
        if (analysisResult.weatherSuitability === "warm-weather") {
          seasonNames.push("Summer", "Monsoon");
        } else if (analysisResult.weatherSuitability === "cold-weather") {
          seasonNames.push("Winter", "Autumn");
        } else {
          seasonNames.push("Summer", "Winter", "Monsoon", "Autumn");
        }

        for (const seasonName of seasonNames) {
          // Find or create season
          const seasonRow = await db
            .select()
            .from(seasons)
            .where(eq(seasons.name, seasonName));
          
          let seasonId: number;
          if (seasonRow.length === 0) {
            await db
              .insert(seasons)
              .values({ name: seasonName });
            // Retrieve ID after insert
            const check = await db.select().from(seasons).where(eq(seasons.name, seasonName));
            seasonId = check[0].id;
          } else {
            seasonId = seasonRow[0].id;
          }

          // Link season to item
          await db
            .insert(clothSeasons)
            .values({ clothId: itemId, seasonId })
            .onConflictDoNothing(); // using ignore insert
        }

        // 3. Associate tags automatically (formality, material, pattern, fit)
        const autoTags: string[] = [];
        if (analysisResult.formality) autoTags.push(analysisResult.formality);
        if (analysisResult.material) autoTags.push(analysisResult.material);
        if (analysisResult.pattern) autoTags.push(analysisResult.pattern);
        if (analysisResult.fit) autoTags.push(analysisResult.fit);

        for (const tagName of autoTags) {
          if (!tagName) continue;
          
          // Capitalize first letter for display elegance
          const formattedTag = tagName.charAt(0).toUpperCase() + tagName.slice(1);
          
          const tagRow = await db
            .select()
            .from(tags)
            .where(eq(tags.name, formattedTag));

          let tagId: number;
          if (tagRow.length === 0) {
            await db.insert(tags).values({ name: formattedTag });
            const check = await db.select().from(tags).where(eq(tags.name, formattedTag));
            tagId = check[0].id;
          } else {
            tagId = tagRow[0].id;
          }
          await db
            .insert(clothTags)
            .values({ clothId: itemId, tagId })
            .onConflictDoNothing();
        }

        // Synchronize search index
        await syncFts(itemId);

        setQueue((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, aiStatus: "COMPLETED" } : item))
        );
      } catch (err) {
        console.error(`AI analysis failed for item ${itemId}:`, err);
        
        await db
          .update(clothes)
          .set({ aiStatus: "FAILED" })
          .where(eq(clothes.id, itemId));

        setQueue((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, aiStatus: "FAILED" } : item))
        );
      } finally {
        setActiveId(null);
        setIsAnalyzing(false);
      }
    };

    analyzeNext();
  }, [queue, isAnalyzing]);

  const startAnalysis = useCallback(() => {
    refreshAnalysisQueue();
  }, [refreshAnalysisQueue]);

  return {
    analysisQueue: queue,
    isAnalyzing,
    activeId,
    startAnalysis,
    refreshAnalysisQueue,
  };
}
