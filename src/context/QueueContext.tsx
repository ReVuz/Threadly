import { createContext, useContext, useEffect, ReactNode } from "react";
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

  // Automatically start background removal when queue loads items
  useEffect(() => {
    if (processQueue.queue.some((item) => item.status === "pending") && !processQueue.isProcessing) {
      // Background removal process runs automatically in hook useEffect
    }
  }, [processQueue.queue, processQueue.isProcessing]);

  // Automatically start Gemini analysis once background removal completes for any item
  useEffect(() => {
    const hasPendingAi = geminiQueue.analysisQueue.some((item) => item.aiStatus === "PENDING");
    
    // Refresh the AI analysis queue when background removal completes items
    if (!processQueue.isProcessing) {
      geminiQueue.refreshAnalysisQueue();
    }
    
    if (hasPendingAi && !geminiQueue.isAnalyzing) {
      geminiQueue.startAnalysis();
    }
  }, [processQueue.isProcessing, geminiQueue.analysisQueue, geminiQueue.isAnalyzing]);

  const refreshAll = () => {
    processQueue.refreshQueue();
    geminiQueue.refreshAnalysisQueue();
  };

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
