import { describe, expect, it } from "vitest";
import {
  buildStylingNotes,
  getCollectionLinks,
  getEditorialGreeting,
  getRecentItems,
  getWearAgainSuggestion,
  splitHighlightedText,
} from "../lib/editorial";

describe("editorial helpers", () => {
  it("builds a time-aware greeting and wardrobe subtitle", () => {
    const greeting = getEditorialGreeting(new Date("2026-07-28T09:00:00+05:30"), 12);
    expect(greeting.title).toBe("Morning Edit");
    expect(greeting.subtitle).toBe("12 pieces in rotation");
  });

  it("derives collection link counts from wardrobe metadata", () => {
    const links = getCollectionLinks([
      { id: 1, nickname: "Office Shirt", type: "top", primaryColor: "white", formality: "smart-casual", weatherSuitability: "all-season" },
      { id: 2, nickname: "Dinner Dress", type: "dress", primaryColor: "black", formality: "formal", weatherSuitability: "all-season" },
      { id: 3, nickname: "Weekend Tee", type: "top", primaryColor: "blue", formality: "casual", weatherSuitability: "warm-weather" },
    ]);

    expect(links.map((link) => [link.label, link.count])).toEqual([
      ["Work", 2],
      ["Weekend", 1],
      ["Travel", 2],
      ["Evening", 1],
    ]);
  });

  it("prefers dresses and recent pairings for wear-again suggestions", () => {
    const suggestion = getWearAgainSuggestion([
      { id: 1, nickname: "Ivory Linen Shirt", type: "top", primaryColor: "ivory", formality: "smart-casual", weatherSuitability: "warm-weather", createdAt: "2026-07-25T10:00:00Z" },
      { id: 2, nickname: "Sand Tailored Trouser", type: "bottom", primaryColor: "sand", formality: "smart-casual", weatherSuitability: "all-season", createdAt: "2026-07-26T10:00:00Z" },
      { id: 3, nickname: "Silk Evening Dress", type: "dress", primaryColor: "black", formality: "formal", weatherSuitability: "all-season", createdAt: "2026-07-27T10:00:00Z" },
    ], new Date("2026-07-28T09:00:00Z"));

    expect(suggestion?.title).toBe("Silk Evening Dress");
    expect(suggestion?.reason).toContain("silhouette");
  });

  it("sorts recent items and composes styling notes", () => {
    const recent = getRecentItems([
      { id: 1, nickname: "A", type: "top", primaryColor: "white", formality: null, weatherSuitability: null, createdAt: "2026-07-25T10:00:00Z" },
      { id: 2, nickname: "B", type: "bottom", primaryColor: "black", formality: null, weatherSuitability: null, createdAt: "2026-07-27T10:00:00Z" },
    ]);

    expect(recent.map((item) => item.id)).toEqual([2, 1]);
    expect(
      buildStylingNotes({
        id: 1,
        nickname: "A",
        type: "top",
        primaryColor: "white",
        formality: "casual",
        weatherSuitability: "warm-weather",
        material: "linen",
        fit: "relaxed",
        pattern: "solid",
      })
    ).toContain("linen texture");
  });

  it("highlights matched fragments without losing the original text", () => {
    const parts = splitHighlightedText("Ivory Linen Shirt", ["linen", "shirt"]);
    expect(parts.some((part) => part.highlighted)).toBe(true);
    expect(parts.map((part) => part.text).join("")).toBe("Ivory Linen Shirt");
  });
});
