export interface WardrobeItemSummary {
  id: number;
  nickname: string | null;
  type: string | null;
  primaryColor: string | null;
  formality: string | null;
  weatherSuitability: string | null;
  material?: string | null;
  pattern?: string | null;
  fit?: string | null;
  createdAt?: string | null;
  tagsText?: string | null;
  imageOriginal?: string;
  imageProcessed?: string | null;
  imageThumbnail?: string | null;
  aiStatus?: string;
}

export interface CollectionLink {
  label: string;
  count: number;
  query: string;
  hint: string;
}

export interface WearAgainSuggestion {
  title: string;
  subtitle: string;
  primaryItem?: WardrobeItemSummary;
  secondaryItem?: WardrobeItemSummary;
  reason: string;
}

const FORMALITY_GROUPS = {
  work: new Set(["smart-casual", "formal"]),
  weekend: new Set(["casual", "loungewear"]),
  travel: new Set(["casual", "smart-casual", "all-season"]),
  evening: new Set(["formal", "festive"]),
};

const SEASON_WEATHER = {
  summer: new Set(["warm-weather", "all-season"]),
  monsoon: new Set(["all-season", "warm-weather"]),
  winter: new Set(["cold-weather", "all-season"]),
  autumn: new Set(["cold-weather", "all-season", "warm-weather"]),
};

function toDateValue(value?: string | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function currentSeason(now: Date) {
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 5) return "summer";
  if (month >= 6 && month <= 8) return "monsoon";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function getSeasonScore(item: WardrobeItemSummary, season: string) {
  const weather = normalizeText(item.weatherSuitability);
  if (!weather) return 1;
  return SEASON_WEATHER[season as keyof typeof SEASON_WEATHER]?.has(weather) ? 3 : 0;
}

function getFormalityScore(item: WardrobeItemSummary, target: string) {
  const formality = normalizeText(item.formality);
  if (!formality) return 1;
  return FORMALITY_GROUPS[target as keyof typeof FORMALITY_GROUPS]?.has(formality) ? 3 : 0;
}

export function getEditorialGreeting(now: Date, itemCount: number) {
  const hour = now.getHours();
  const title = hour < 11 ? "Morning Edit" : hour < 17 ? "Welcome Back" : "Evening Collection";
  const subtitle = itemCount > 0 ? `${itemCount} pieces in rotation` : "Your wardrobe is waiting";
  return { title, subtitle };
}

export function getCollectionLinks(items: WardrobeItemSummary[]): CollectionLink[] {
  const counts = {
    work: 0,
    weekend: 0,
    travel: 0,
    evening: 0,
  };

  for (const item of items) {
    const formality = normalizeText(item.formality);
    if (FORMALITY_GROUPS.work.has(formality)) counts.work += 1;
    if (FORMALITY_GROUPS.weekend.has(formality)) counts.weekend += 1;
    if (FORMALITY_GROUPS.travel.has(formality)) counts.travel += 1;
    if (FORMALITY_GROUPS.evening.has(formality)) counts.evening += 1;
  }

  return [
    { label: "Work", count: counts.work, query: "smart-casual formal", hint: "Sharp and composed" },
    { label: "Weekend", count: counts.weekend, query: "casual", hint: "Easy rotation pieces" },
    { label: "Travel", count: counts.travel, query: "all-season", hint: "Versatile layers" },
    { label: "Evening", count: counts.evening, query: "formal festive", hint: "After-dark edits" },
  ];
}

export function getRecentItems(items: WardrobeItemSummary[], limit = 3) {
  return [...items]
    .sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt))
    .slice(0, limit);
}

function findBestPair(items: WardrobeItemSummary[], season: string) {
  const tops = items.filter((item) => normalizeText(item.type) === "top");
  const bottoms = items.filter((item) => normalizeText(item.type) === "bottom");

  let bestTop: WardrobeItemSummary | undefined;
  let bestBottom: WardrobeItemSummary | undefined;
  let bestScore = -1;

  for (const top of tops) {
    for (const bottom of bottoms) {
      const score =
        getSeasonScore(top, season) +
        getSeasonScore(bottom, season) +
        getFormalityScore(top, "work") +
        getFormalityScore(bottom, "work");

      if (score > bestScore) {
        bestScore = score;
        bestTop = top;
        bestBottom = bottom;
      }
    }
  }

  return { bestTop, bestBottom, bestScore };
}

export function getWearAgainSuggestion(items: WardrobeItemSummary[], now = new Date()): WearAgainSuggestion | null {
  if (items.length === 0) return null;

  const season = currentSeason(now);
  const dresses = items
    .filter((item) => normalizeText(item.type) === "dress")
    .sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt));

  if (dresses.length > 0) {
    const dress = dresses[0];
    return {
      title: dress.nickname || "Recent Dress",
      subtitle: `${dress.primaryColor || "Neutral"} dress for ${season}`,
      primaryItem: dress,
      reason: "A single-piece edit keeps the silhouette clean and easy to repeat.",
    };
  }

  const pair = findBestPair(items, season);
  if (pair.bestTop && pair.bestBottom) {
    return {
      title: `${pair.bestTop.nickname || "Top"} + ${pair.bestBottom.nickname || "Bottom"}`,
      subtitle: `Balanced for ${season} and everyday rotation`,
      primaryItem: pair.bestTop,
      secondaryItem: pair.bestBottom,
      reason: "The pairing scores well for season, formality, and visual balance.",
    };
  }

  const newest = getRecentItems(items, 1)[0];
  if (!newest) return null;

  return {
    title: newest.nickname || "Wear Again",
    subtitle: `${newest.primaryColor || "Neutral"} ${newest.type || "piece"}`,
    primaryItem: newest,
    reason: "A fallback recommendation built from your newest item.",
  };
}

export function buildStylingNotes(item: WardrobeItemSummary) {
  const notes = [
    item.material ? `${item.material} texture` : null,
    item.fit ? `${item.fit} fit` : null,
    item.pattern ? `${item.pattern} pattern` : null,
    item.formality ? `${item.formality} for rotation` : null,
    item.weatherSuitability ? `${item.weatherSuitability.replace("-", " ")} ready` : null,
  ].filter(Boolean);

  if (notes.length === 0) {
    return "No styling notes available yet. Add more metadata to generate a richer editorial summary.";
  }

  return notes.join(" · ");
}

export function splitHighlightedText(text: string, terms: string[]) {
  if (!text || terms.length === 0) {
    return [{ text, highlighted: false }];
  }

  const normalizedTerms = [...new Set(terms.map((term) => normalizeText(term)).filter(Boolean))];
  if (normalizedTerms.length === 0) {
    return [{ text, highlighted: false }];
  }

  const matcher = new RegExp(`(${normalizedTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  const parts = text.split(matcher).filter(Boolean);
  return parts.map((part) => ({
    text: part,
    highlighted: normalizedTerms.includes(part.toLowerCase()),
  }));
}
