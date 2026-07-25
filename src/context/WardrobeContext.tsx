import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { db } from "../lib/db";
import { wardrobes } from "../../drizzle/schema";

interface Wardrobe {
  id: number;
  name: string;
}

interface WardrobeContextType {
  activeWardrobeId: number;
  activeWardrobeName: string;
  setActiveWardrobeId: (id: number) => void;
  wardrobesList: Wardrobe[];
  refreshWardrobesList: () => Promise<void>;
  createWardrobe: (name: string) => Promise<number>;
}

const WardrobeContext = createContext<WardrobeContextType | undefined>(undefined);

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [activeWardrobeId, setActiveWardrobeIdState] = useState<number>(() => {
    const saved = localStorage.getItem("threadly_active_wardrobe_id");
    return saved ? parseInt(saved, 10) : 1;
  });
  
  const [wardrobesList, setWardrobesList] = useState<Wardrobe[]>([]);
  const [activeWardrobeName, setActiveWardrobeName] = useState<string>("My Wardrobe");

  const refreshWardrobesList = useCallback(async () => {
    try {
      const list = await db.select({ id: wardrobes.id, name: wardrobes.name }).from(wardrobes);
      setWardrobesList(list);
      
      const active = list.find(w => w.id === activeWardrobeId);
      if (active) {
        setActiveWardrobeName(active.name);
      } else if (list.length > 0) {
        setActiveWardrobeIdState(list[0].id);
        setActiveWardrobeName(list[0].name);
        localStorage.setItem("threadly_active_wardrobe_id", String(list[0].id));
      }
    } catch (err) {
      console.error("Failed to load wardrobes:", err);
    }
  }, [activeWardrobeId]);

  const setActiveWardrobeId = useCallback((id: number) => {
    setActiveWardrobeIdState(id);
    localStorage.setItem("threadly_active_wardrobe_id", String(id));
    const active = wardrobesList.find(w => w.id === id);
    if (active) {
      setActiveWardrobeName(active.name);
    }
  }, [wardrobesList]);

  const createWardrobe = useCallback(async (name: string) => {
    try {
      // Insert new wardrobe record
      await db.insert(wardrobes).values({ name });
      
      // Refresh list to find the inserted ID
      const conn = await db.select({ id: wardrobes.id, name: wardrobes.name }).from(wardrobes);
      setWardrobesList(conn);
      
      // Find the created one by name (highest ID or latest)
      const matching = conn.filter(w => w.name === name);
      if (matching.length > 0) {
        const newId = matching[matching.length - 1].id;
        setActiveWardrobeId(newId);
        return newId;
      }
      return 1;
    } catch (err) {
      console.error("Failed to create wardrobe:", err);
      return 1;
    }
  }, [setActiveWardrobeId]);

  useEffect(() => {
    refreshWardrobesList();
  }, [refreshWardrobesList]);

  return (
    <WardrobeContext.Provider
      value={{
        activeWardrobeId,
        activeWardrobeName,
        setActiveWardrobeId,
        wardrobesList,
        refreshWardrobesList,
        createWardrobe,
      }}
    >
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  const context = useContext(WardrobeContext);
  if (!context) {
    throw new Error("useWardrobe must be used within a WardrobeProvider");
  }
  return context;
}
