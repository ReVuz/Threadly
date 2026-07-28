import { describe, expect, it } from "vitest";
import { buildFtsMatchQuery, expandSearchTokens, itemMatchesSearch } from "../lib/search";

describe("search helpers", () => {
  it("expands editorial synonyms into searchable token groups", () => {
    const groups = expandSearchTokens("black office top");
    expect(groups).toHaveLength(3);
    expect(groups[1].terms).toContain("smart casual");
  });

  it("builds a conjunctive FTS match query", () => {
    const query = buildFtsMatchQuery("black top");
    expect(query).toContain("AND");
    expect(query).toContain("black");
    expect(query).toContain("top");
  });

  it("matches items against normalized metadata and tags", () => {
    expect(
      itemMatchesSearch(
        {
          id: 1,
          nickname: "Ivory Linen Shirt",
          type: "top",
          primaryColor: "ivory",
          pattern: "solid",
          material: "linen",
          fit: "relaxed",
          formality: "smart-casual",
          weatherSuitability: "warm-weather",
          tagsText: "office summer",
        },
        "office ivory shirt"
      )
    ).toBe(true);
  });
});
