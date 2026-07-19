import { createContext, useCallback, useContext, useEffect, ReactNode } from "react";
import { useProcessQueue, type QueueItem } from "../hooks/useProcessQueue";
import { useGeminiAnalysis, type AnalysisQueueItem } from "../hooks/useGeminiAnalysis";

interface QueueContextType {
  queue: QueueItem[];
  isProcessing: boolean;
  addToQueue: () => void;
  refreshQueue: () => Promise<void>;
  
  analysisQueue: AnalysisQueueItem[];
  isAnalyzing: boolean;
  startAnalysis: () => void;
  refreshAnalysisQueue: () => Promise<void>;
  
  refreshAll: () => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export function QueueProvider({ children }: { children: ReactNode }) {
  const processQueue = useProcessQueue();
  const geminiQueue = useGeminiAnalysis();
  const { refreshQueue } = processQueue;
  const { refreshAnalysisQueue } = geminiQueue;

  const refreshAll = useCallback(async () => {
    await refreshQueue();
    await refreshAnalysisQueue();
  }, [refreshQueue, refreshAnalysisQueue]);

  // Pick up any backlog left from a previous app session.
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);


  // Automatically start background removal when queue loads items
  useEffect(() => {
    if (processQueue.queue.some((item) => item.status === "pending") && !processQueue.isProcessing) {
      // Background removal process runs automatically in hook useEffect
    }
  }, [processQueue.queue, processQueue.isProcessing]);

  // Automatically trigger Gemini analysis queue refresh when background processing finishes
  useEffect(() => {
    if (!processQueue.isProcessing) {
      // Background removal just finished (or is idle) — pick up new items for AI analysis
      geminiQueue.refreshAnalysisQueue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processQueue.isProcessing]);

  return (
    <QueueContext.Provider
      value={{
        queue: processQueue.queue,
        isProcessing: processQueue.isProcessing,
        addToQueue: processQueue.addToQueue,
        refreshQueue: processQueue.refreshQueue,
        
        analysisQueue: geminiQueue.analysisQueue,
        isAnalyzing: geminiQueue.isAnalyzing,
        startAnalysis: geminiQueue.startAnalysis,
        refreshAnalysisQueue: geminiQueue.refreshAnalysisQueue,
        
        refreshAll,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error("useQueue must be used within a QueueProvider");
  }
  return context;
}
