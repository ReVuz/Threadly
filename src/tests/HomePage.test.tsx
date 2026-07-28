import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../pages/HomePage";

const selectMock = vi.hoisted(() => vi.fn());

vi.mock("../context/QueueContext", () => ({
  useQueue: () => ({
    queue: [{ id: 2, nickname: "Queued Shirt", aiStatus: "PENDING" }],
    isProcessing: false,
    addToQueue: vi.fn(),
    refreshQueue: vi.fn(),
    analysisQueue: [{ id: 3, nickname: "Analysis Coat", aiStatus: "PENDING" }],
    isAnalyzing: false,
    startAnalysis: vi.fn(),
    refreshAnalysisQueue: vi.fn(),
    refreshAll: vi.fn(),
  }),
}));

vi.mock("../context/WardrobeContext", () => ({
  useWardrobe: () => ({
    activeWardrobeId: 1,
    activeWardrobeName: "My Wardrobe",
    setActiveWardrobeId: vi.fn(),
    wardrobesList: [],
    refreshWardrobesList: vi.fn(),
    createWardrobe: vi.fn(),
  }),
}));

vi.mock("../lib/db", () => ({
  db: {
    select: selectMock,
  },
  initDb: vi.fn(),
  syncFts: vi.fn(),
}));

describe("HomePage", () => {
  beforeEach(() => {
    selectMock.mockReset();
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: async () => [
          {
            id: 1,
            nickname: "Ivory Linen Shirt",
            type: "top",
            primaryColor: "ivory",
            formality: "smart-casual",
            weatherSuitability: "warm-weather",
            material: "linen",
            createdAt: "2026-07-27T12:00:00Z",
            imageOriginal: "/tmp/original.png",
            imageProcessed: "/tmp/processed.png",
            imageThumbnail: "/tmp/thumb.png",
            aiStatus: "COMPLETED",
          },
        ],
      }),
    }));
  });

  it("renders the magazine cover sections and pending analysis list", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Recently Added")).toBeInTheDocument();
    expect(screen.getByText("Wear Again")).toBeInTheDocument();
    expect(screen.getByText("Pending Analysis")).toBeInTheDocument();
    expect(screen.getAllByText("Ivory Linen Shirt").length).toBeGreaterThan(0);
  });
});
