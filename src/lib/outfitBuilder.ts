import type { WardrobeItemSummary } from "./editorial";

export interface OutfitSuggestion {
  title: string;
  reasoning: string;
  itemIds: number[];
  primaryKind: "dress" | "pair";
}

const FORMALITY_SCORE: Record<string, number> = {
  loungewear: 0,
  casual: 1,
  "smart-casual": 2,
  formal: 3,
  festive: 4,
};

const NEUTRAL_COLORS = new Set([
  "black",
  "white",
  "ivory",
  "cream",
  "beige",
  "grey",
  "gray",
  "navy",
  "brown",
  "sand",
]);

const COLOR_FAMILIES: Record<string, string> = {
  black: "neutral",
  white: "neutral",
  ivory: "neutral",
  cream: "neutral",
  beige: "neutral",
  grey: "neutral",
  gray: "neutral",
  navy: "cool",
  blue: "cool",
  green: "cool",
  red: "warm",
  pink: "warm",
  yellow: "warm",
  gold: "warm",
  brown: "warm",
  sand: "warm",
};

const SEASON_MATCH: Record<string, string[]> = {
  "warm-weather": ["summer", "monsoon"],
  "cold-weather": ["winter", "autumn"],
  "all-season": ["summer", "winter", "monsoon", "autumn"],
};

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function currentSeason(now = new Date()) {
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 5) return "summer";
  if (month >= 6 && month <= 8) return "monsoon";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function isTop(item: WardrobeItemSummary) {
  return normalize(item.type) === "top";
}

function isBottom(item: WardrobeItemSummary) {
  return normalize(item.type) === "bottom";
}

function isDress(item: WardrobeItemSummary) {
  const type = normalize(item.type);
  return type === "dress" || type === "co-ord" || type === "ethnic";
}

function isJacket(item: WardrobeItemSummary) {
  return normalize(item.type) === "jacket";
}

function seasonScore(item: WardrobeItemSummary, season: string) {
  const weather = normalize(item.weatherSuitability);
  if (!weather) return 1;
  return SEASON_MATCH[weather]?.includes(season) ? 3 : 0;
}

function formalityScore(item: WardrobeItemSummary, target: string) {
  const formality = normalize(item.formality);
  if (!formality) return 1;
  const itemScore = FORMALITY_SCORE[formality] ?? 1;
  const targetScore = FORMALITY_SCORE[target] ?? 1;
  const distance = Math.abs(itemScore - targetScore);
  return Math.max(0, 4 - distance);
}

function colorScore(a?: string | null, b?: string | null) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 1;
  if (left === right) return 3;
  const leftFamily = COLOR_FAMILIES[left];
  const rightFamily = COLOR_FAMILIES[right];
  if (NEUTRAL_COLORS.has(left) || NEUTRAL_COLORS.has(right)) return 2;
  if (leftFamily && rightFamily && leftFamily === rightFamily) return 2;
  return 0;
}

function scorePair(top: WardrobeItemSummary, bottom: WardrobeItemSummary, season: string) {
  return (
    seasonScore(top, season) +
    seasonScore(bottom, season) +
    formalityScore(top, normalize(bottom.formality) || "smart-casual") +
    formalityScore(bottom, normalize(top.formality) || "smart-casual") +
    colorScore(top.primaryColor, bottom.primaryColor)
  );
}

function scoreDress(dress: WardrobeItemSummary, season: string) {
  return seasonScore(dress, season) + formalityScore(dress, "formal");
}

export function buildOutfitSuggestion(items: WardrobeItemSummary[], now = new Date()): OutfitSuggestion | null {
  if (items.length === 0) return null;

  const season = currentSeason(now);
  const dresses = items.filter(isDress);
  const tops = items.filter(isTop);
  const bottoms = items.filter(isBottom);
  const jackets = items.filter(isJacket);

  let bestDress: WardrobeItemSummary | undefined;
  let bestDressScore = -1;
  for (const dress of dresses) {
    const score = scoreDress(dress, season);
    if (score > bestDressScore) {
      bestDress = dress;
      bestDressScore = score;
    }
  }

  let bestTop: WardrobeItemSummary | undefined;
  let bestBottom: WardrobeItemSummary | undefined;
  let bestPairScore = -1;
  for (const top of tops) {
    for (const bottom of bottoms) {
      const score = scorePair(top, bottom, season);
      if (score > bestPairScore) {
        bestPairScore = score;
        bestTop = top;
        bestBottom = bottom;
      }
    }
  }

  if (!bestDress && (!bestTop || !bestBottom)) {
    return null;
  }

  if (bestDress && bestDressScore >= bestPairScore) {
    const jacket = jackets
      .map((candidate) => ({
        candidate,
        score: seasonScore(candidate, season) + formalityScore(candidate, normalize(bestDress.formality) || "formal"),
      }))
      .sort((a, b) => b.score - a.score)[0];

    const itemIds = [bestDress.id];
    if (jacket && jacket.score > 3) {
      itemIds.push(jacket.candidate.id);
    }

    return {
      title: bestDress.nickname || "Dress Edit",
      reasoning: `A single-piece silhouette keeps the look clean for ${season}.` + (itemIds.length > 1 ? " A jacket layer is added for balance." : ""),
      itemIds,
      primaryKind: "dress",
    };
  }

  if (!bestTop || !bestBottom) {
    return null;
  }

  const jacket = jackets
    .map((candidate) => ({
      candidate,
      score: seasonScore(candidate, season) + formalityScore(candidate, normalize(bestTop.formality) || "smart-casual"),
    }))
    .sort((a, b) => b.score - a.score)[0];

  const itemIds = [bestTop.id, bestBottom.id];
  let reasoning = `The top and bottom pair well for ${season} with balanced formality and color harmony.`;
  if (jacket && jacket.score > 3) {
    itemIds.push(jacket.candidate.id);
    reasoning += " A jacket layer strengthens the silhouette.";
  }

  return {
    title: `${bestTop.nickname || "Top"} + ${bestBottom.nickname || "Bottom"}`,
    reasoning,
    itemIds,
    primaryKind: "pair",
  };
}

export function summarizeOutfitItems(items: WardrobeItemSummary[]) {
  return items
    .map((item) => item.nickname || item.type || `Item ${item.id}`)
    .filter(Boolean)
    .join(" · ");
}
