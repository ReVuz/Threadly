import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WardrobePage from "../pages/WardrobePage";

const selectMock = vi.hoisted(() => vi.fn());

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

describe("WardrobePage", () => {
  beforeEach(() => {
    selectMock.mockReset();
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: async () => [
          {
            id: 1,
            uuid: "uuid-1",
            nickname: "Ivory Linen Shirt",
            type: "top",
            primaryColor: "ivory",
            formality: "smart-casual",
            weatherSuitability: "warm-weather",
            material: "linen",
            pattern: "solid",
            fit: "relaxed",
            imageOriginal: "/tmp/original.png",
            imageProcessed: "/tmp/processed.png",
            imageThumbnail: "/tmp/thumb.png",
            aiStatus: "COMPLETED",
            createdAt: "2026-07-27T12:00:00Z",
          },
          {
            id: 2,
            uuid: "uuid-2",
            nickname: "Sand Trouser",
            type: "bottom",
            primaryColor: "sand",
            formality: "smart-casual",
            weatherSuitability: "all-season",
            material: "cotton",
            pattern: "solid",
            fit: "tailored",
            imageOriginal: "/tmp/original-2.png",
            imageProcessed: "/tmp/processed-2.png",
            imageThumbnail: "/tmp/thumb-2.png",
            aiStatus: "COMPLETED",
            createdAt: "2026-07-26T12:00:00Z",
          },
        ],
      }),
    }));
  });

  it("renders the editorial grid with a hero garment and sidebar filters", async () => {
    render(
      <MemoryRouter>
        <WardrobePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Add Clothing Items")).toBeInTheDocument();
    expect(await screen.findByText("Ivory Linen Shirt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tops" })).toBeInTheDocument();
    expect(document.querySelector('[data-hero="true"]')).toBeTruthy();
  });
});
