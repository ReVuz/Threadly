import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DiscoverPage from "../pages/DiscoverPage";
import { db } from "../lib/db";
import { generateGapAnalysis } from "../lib/gemini";

// Mock Tauri core plugins
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => `converted://${p}`,
}));

vi.mock("../lib/gemini", () => ({
  generateGapAnalysis: vi.fn(),
}));

vi.mock("../lib/db", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue([]),
  };
  return {
    db: mockDb,
  };
});

describe("DiscoverPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders empty state if no clothes exist", async () => {
    vi.mocked(db.from).mockResolvedValueOnce([]); // No clothes

    render(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByText("No items to analyze")).toBeInTheDocument();
    });
  });

  it("triggers AI analysis and displays results if clothes exist", async () => {
    const mockClothesList = [
      { id: 1, type: "top", primaryColor: "black", formality: "casual", material: "cotton", pattern: "solid" }
    ];
    vi.mocked(db.from).mockResolvedValueOnce(mockClothesList);

    const mockAnalysis = {
      colorBalance: [{ color: "black", percentage: 100 }],
      colorFeedback: "Color distribution is skewed to dark.",
      occasions: [{ name: "casual", rating: 5 }],
      occasionFeedback: "Occasions are well covered.",
      missingEssentials: [{ item: "white shirt", owned: 0, recommended: 1 }],
      essentialsFeedback: "Get a white shirt.",
      outfitUnlockEstimate: "Unlocks 15 outfits.",
    };
    vi.mocked(generateGapAnalysis).mockResolvedValueOnce(mockAnalysis);

    render(<DiscoverPage />);

    await waitFor(() => {
      expect(screen.getByText("Wardrobe Gap Analysis")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Color Balance")).toBeInTheDocument();
      expect(screen.getByText("Color distribution is skewed to dark.")).toBeInTheDocument();
      expect(screen.getByText("Unlocks 15 outfits.")).toBeInTheDocument();
    });

    expect(generateGapAnalysis).toHaveBeenCalled();
  });
});
