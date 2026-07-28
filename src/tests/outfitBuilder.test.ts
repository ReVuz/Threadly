import { describe, expect, it } from "vitest";
import { buildOutfitSuggestion, summarizeOutfitItems } from "../lib/outfitBuilder";

describe("outfit builder helpers", () => {
  it("prefers a top and bottom pair when no dress is available", () => {
    const suggestion = buildOutfitSuggestion(
      [
        { id: 1, nickname: "Ivory Linen Shirt", type: "top", primaryColor: "ivory", formality: "smart-casual", weatherSuitability: "warm-weather", createdAt: "2026-07-27T10:00:00Z" },
        { id: 2, nickname: "Sand Trousers", type: "bottom", primaryColor: "sand", formality: "smart-casual", weatherSuitability: "all-season", createdAt: "2026-07-26T10:00:00Z" },
        { id: 3, nickname: "Navy Blazer", type: "jacket", primaryColor: "navy", formality: "formal", weatherSuitability: "all-season", createdAt: "2026-07-25T10:00:00Z" },
      ],
      new Date("2026-07-28T09:00:00+05:30")
    );

    expect(suggestion?.primaryKind).toBe("pair");
    expect(suggestion?.itemIds).toEqual([1, 2, 3]);
    expect(suggestion?.reasoning).toContain("jacket layer");
  });

  it("prefers a dress when it is the strongest option", () => {
    const suggestion = buildOutfitSuggestion(
      [
        { id: 1, nickname: "White Shirt", type: "top", primaryColor: "white", formality: "casual", weatherSuitability: "warm-weather", createdAt: "2026-07-27T10:00:00Z" },
        { id: 2, nickname: "Black Dress", type: "dress", primaryColor: "black", formality: "formal", weatherSuitability: "all-season", createdAt: "2026-07-28T10:00:00Z" },
        { id: 3, nickname: "Light Blazer", type: "jacket", primaryColor: "cream", formality: "formal", weatherSuitability: "all-season", createdAt: "2026-07-25T10:00:00Z" },
      ],
      new Date("2026-07-28T09:00:00+05:30")
    );

    expect(suggestion?.primaryKind).toBe("dress");
    expect(suggestion?.itemIds[0]).toBe(2);
    expect(suggestion?.reasoning).toContain("single-piece silhouette");
  });

  it("returns null when no valid outfit exists", () => {
    const suggestion = buildOutfitSuggestion([
      { id: 1, nickname: "Shirt 1", type: "top", primaryColor: "white", formality: "casual", weatherSuitability: "warm-weather" },
      { id: 2, nickname: "Shirt 2", type: "top", primaryColor: "blue", formality: "casual", weatherSuitability: "warm-weather" },
    ]);

    expect(suggestion).toBeNull();
  });

  it("summarizes selected outfit items", () => {
    expect(
      summarizeOutfitItems([
        { id: 1, nickname: "Ivory Linen Shirt", type: "top", primaryColor: "ivory", formality: "smart-casual", weatherSuitability: "warm-weather" },
        { id: 2, nickname: null, type: "bottom", primaryColor: "sand", formality: "smart-casual", weatherSuitability: "all-season" },
      ])
    ).toBe("Ivory Linen Shirt · bottom");
  });
});
