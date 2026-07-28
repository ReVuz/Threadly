import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OutfitsPage from "../pages/OutfitsPage";

const selectMock = vi.hoisted(() => vi.fn());
const executeMock = vi.hoisted(() => vi.fn().mockResolvedValue({ lastInsertId: 42, rowsAffected: 1 }));

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
  initDb: vi.fn().mockResolvedValue({ execute: executeMock }),
  syncFts: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (value: string) => value,
}));

describe("OutfitsPage", () => {
  beforeEach(() => {
    let callCount = 0;
    selectMock.mockReset();
    executeMock.mockClear();
    selectMock.mockImplementation(() => ({
      from: () => {
        callCount += 1;
        const stage = ((callCount - 1) % 3) + 1;

        if (stage === 1) {
          return {
            where: async () => [
              {
                id: 1,
                nickname: "Ivory Linen Shirt",
                type: "top",
                primaryColor: "ivory",
                formality: "smart-casual",
                weatherSuitability: "warm-weather",
                imageOriginal: "/tmp/original.png",
                imageProcessed: "/tmp/processed.png",
                imageThumbnail: "/tmp/thumb.png",
              },
              {
                id: 2,
                nickname: "Sand Trousers",
                type: "bottom",
                primaryColor: "sand",
                formality: "smart-casual",
                weatherSuitability: "all-season",
                imageOriginal: "/tmp/original-2.png",
                imageProcessed: "/tmp/processed-2.png",
                imageThumbnail: "/tmp/thumb-2.png",
              },
              {
                id: 3,
                nickname: "Navy Blazer",
                type: "jacket",
                primaryColor: "navy",
                formality: "formal",
                weatherSuitability: "all-season",
                imageOriginal: "/tmp/original-3.png",
                imageProcessed: "/tmp/processed-3.png",
                imageThumbnail: "/tmp/thumb-3.png",
              },
            ],
          };
        }

        if (stage === 2) {
          return {
            where: async () => [
              {
                id: 11,
                name: "Weekend Edit",
                occasion: "casual",
                rating: 4,
                favorite: 0,
                notes: "Board reasoning",
              },
            ],
          };
        }

        return {
          innerJoin: () => ({
            where: async () => [
              { outfitId: 11, clothId: 1 },
              { outfitId: 11, clothId: 2 },
            ],
          }),
        };
      },
    }));
  });

  it("renders saved outfits and the builder board", async () => {
    render(
      <MemoryRouter>
        <OutfitsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Weekend Edit")).toBeInTheDocument();
    expect(screen.getByText("Ivory Linen Shirt")).toBeInTheDocument();
    expect(screen.getByText("Sand Trousers")).toBeInTheDocument();
    expect(screen.getByText("Board reasoning")).toBeInTheDocument();
  });

  it("creates an outfit from selected garments", async () => {
    render(
      <MemoryRouter>
        <OutfitsPage />
      </MemoryRouter>
    );

    const topButton = screen.getByText("Ivory Linen Shirt", { selector: "strong" }).closest("button");
    const bottomButton = screen.getByText("Sand Trousers", { selector: "strong" }).closest("button");
    expect(topButton).toBeTruthy();
    expect(bottomButton).toBeTruthy();
    if (topButton) fireEvent.click(topButton);
    if (bottomButton) fireEvent.click(bottomButton);

    fireEvent.change(screen.getByLabelText("Outfit name"), { target: { value: "Summer Edit" } });
    fireEvent.change(screen.getByLabelText("Occasion"), { target: { value: "office" } });
    fireEvent.change(screen.getByLabelText("Rating"), { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText("Favorite"));

    fireEvent.click(screen.getByText("Save Outfit"));

    await waitFor(() => {
      expect(executeMock).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO outfits"),
        expect.arrayContaining([1, "Summer Edit", "office", 5, 1, null])
      );
    });

    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO outfit_items"),
      [42, 1]
    );
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO outfit_items"),
      [42, 2]
    );
  });

  it("updates favorite, rating, and delete actions for saved outfits", async () => {
    render(
      <MemoryRouter>
        <OutfitsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Weekend Edit")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Favorite"));
    fireEvent.click(screen.getByRole("button", { name: "★" }));
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(executeMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE outfits SET favorite"), expect.any(Array));
    });
    expect(executeMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE outfits SET rating"), expect.any(Array));
    expect(executeMock).toHaveBeenCalledWith("DELETE FROM outfits WHERE id = ?", [11]);
  });
});

