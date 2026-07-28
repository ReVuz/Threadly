import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchPage from "../pages/SearchPage";

const navigateMock = vi.hoisted(() => vi.fn());
const searchClothesMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    {
      id: 7,
      uuid: "uuid-7",
      nickname: "Ivory Linen Shirt",
      type: "top",
      primaryColor: "ivory",
      secondaryColor: null,
      pattern: "solid",
      material: "linen",
      fit: "relaxed",
      formality: "smart-casual",
      weatherSuitability: "warm-weather",
      imageOriginal: "/tmp/original.png",
      imageProcessed: "/tmp/processed.png",
      imageThumbnail: "/tmp/thumb.png",
      tagsText: "office summer",
      createdAt: "2026-07-27T12:00:00Z",
    },
  ])
);

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
  searchClothes: searchClothesMock,
  db: {},
  initDb: vi.fn(),
  syncFts: vi.fn(),
}));

describe("SearchPage", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    searchClothesMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces input, runs search, and supports keyboard navigation", async () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("black top, office shirt, winter coat...");
    fireEvent.change(input, { target: { value: "black top" } });

    await new Promise((resolve) => setTimeout(resolve, 250));

    await waitFor(() => {
      expect(searchClothesMock).toHaveBeenCalledWith(1, "black top");
    });

    expect(await screen.findByText("Ivory Linen Shirt")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(navigateMock).toHaveBeenCalledWith("/wardrobe/7");
  });
});
