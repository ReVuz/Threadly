import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

    await screen.findByText("Ivory Linen Shirt");

    fireEvent.click(screen.getByRole("button", { name: /Ivory Linen Shirt/i }));
    fireEvent.click(screen.getByRole("button", { name: /Sand Trousers/i }));

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

  it("suggests an outfit and surfaces the reasoning in the board", async () => {
    render(
      <MemoryRouter>
        <OutfitsPage />
      </MemoryRouter>
    );

    await screen.findByText("Ivory Linen Shirt");

    fireEvent.click(screen.getByRole("button", { name: "Suggest with AI" }));

    await waitFor(() => {
      expect(screen.getByText("Compatibility preview")).toBeInTheDocument();
    });

    expect(screen.getByText("Ivory Linen Shirt · Sand Trousers · Navy Blazer")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toHaveValue(
      "The top and bottom pair well for monsoon with balanced formality and color harmony. A jacket layer strengthens the silhouette."
    );
  });

  it("updates favorite, rating, and delete actions for saved outfits", async () => {
    render(
      <MemoryRouter>
        <OutfitsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Weekend Edit")).toBeInTheDocument();

    const savedOutfit = screen.getByText("Weekend Edit").closest("article");
    expect(savedOutfit).toBeTruthy();
    if (!savedOutfit) {
      throw new Error("Saved outfit card was not rendered");
    }

    const outfitCard = within(savedOutfit);
    fireEvent.click(outfitCard.getByRole("button", { name: "Favorite" }));
    fireEvent.click(outfitCard.getByRole("button", { name: "Rate Weekend Edit 1 star" }));
    fireEvent.click(outfitCard.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(executeMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE outfits SET favorite"), expect.any(Array));
    });
    expect(executeMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE outfits SET rating"), expect.any(Array));
    expect(executeMock).toHaveBeenCalledWith("DELETE FROM outfits WHERE id = ?", [11]);
  });
});
