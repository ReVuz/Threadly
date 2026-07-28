import { SEARCH_SYNONYMS } from "./searchConfig";

export interface SearchableItem {
  id: number;
  nickname: string | null;
  type: string | null;
  primaryColor: string | null;
  pattern?: string | null;
  material?: string | null;
  fit?: string | null;
  formality?: string | null;
  weatherSuitability?: string | null;
  tagsText?: string | null;
}

export interface SearchTokenGroup {
  original: string;
  terms: string[];
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenizeQuery(query: string) {
  return query
    .split(/[\s,]+/g)
    .map(normalize)
    .filter(Boolean);
}

function normalizeSearchableValue(value: string) {
  return value.toLowerCase().replace(/-/g, " ");
}

export function expandSearchTokens(query: string): SearchTokenGroup[] {
  return tokenizeQuery(query).map((token) => {
    const terms = new Set<string>([token, token.replace(/-/g, " ")]);
    const mapping = SEARCH_SYNONYMS[token];
    if (mapping?.type) {
      terms.add(normalizeSearchableValue(mapping.type));
    }
    if (mapping?.formality) {
      terms.add(normalizeSearchableValue(mapping.formality));
    }
    if (mapping?.weatherSuitability) {
      terms.add(normalizeSearchableValue(mapping.weatherSuitability));
    }
    if (mapping?.primaryColor) {
      terms.add(normalizeSearchableValue(mapping.primaryColor));
    }
    return {
      original: token,
      terms: [...terms].filter(Boolean),
    };
  });
}

export function buildFtsMatchQuery(query: string) {
  const groups = expandSearchTokens(query);
  if (groups.length === 0) {
    return "";
  }

  return groups
    .map(({ terms }) => `(${terms.map((term) => `"${term.replace(/"/g, '""')}"`).join(" OR ")})`)
    .join(" AND ");
}

export function itemMatchesSearch(item: SearchableItem, query: string) {
  const groups = expandSearchTokens(query);
  if (groups.length === 0) return true;

  const searchableText = normalizeSearchableValue(
    [
      item.nickname,
      item.type,
      item.primaryColor,
      item.pattern,
      item.material,
      item.fit,
      item.formality,
      item.weatherSuitability,
      item.tagsText,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return groups.every(({ terms }) => terms.some((term) => searchableText.includes(normalizeSearchableValue(term))));
}

export function extractSearchTerms(query: string) {
  return expandSearchTokens(query).flatMap((group) => group.terms);
}

