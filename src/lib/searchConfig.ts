// Search configuration mapping natural language synonyms to database columns and filter criteria
export interface SearchFilterConfig {
  type?: string;
  formality?: string;
  weatherSuitability?: string;
  primaryColor?: string;
}

export const SEARCH_SYNONYMS: Record<string, SearchFilterConfig> = {
  // Types / Categories
  "shirt": { type: "top" },
  "shirts": { type: "top" },
  "top": { type: "top" },
  "tops": { type: "top" },
  "blouse": { type: "top" },
  "t-shirt": { type: "top" },
  "tshirt": { type: "top" },
  "pant": { type: "bottom" },
  "pants": { type: "bottom" },
  "trouser": { type: "bottom" },
  "trousers": { type: "bottom" },
  "jeans": { type: "bottom" },
  "denim": { type: "bottom" },
  "skirt": { type: "bottom" },
  "dress": { type: "dress" },
  "dresses": { type: "dress" },
  "jacket": { type: "jacket" },
  "jackets": { type: "jacket" },
  "coat": { type: "jacket" },
  "sweater": { type: "jacket" },
  "hoodie": { type: "jacket" },
  "kurti": { type: "ethnic" },
  "saree": { type: "ethnic" },
  "suit": { type: "formal" },
  
  // Occasions / Formalities
  "formal": { formality: "formal" },
  "office": { formality: "smart-casual" },
  "work": { formality: "smart-casual" },
  "business": { formality: "formal" },
  "dinner": { formality: "formal" },
  "party": { formality: "festive" },
  "wedding": { formality: "festive" },
  "festive": { formality: "festive" },
  "casual": { formality: "casual" },
  "home": { formality: "loungewear" },
  "lounge": { formality: "loungewear" },
  "loungewear": { formality: "loungewear" },

  // Weather / Seasons
  "winter": { weatherSuitability: "cold-weather" },
  "cold": { weatherSuitability: "cold-weather" },
  "summer": { weatherSuitability: "warm-weather" },
  "warm": { weatherSuitability: "warm-weather" },
  "monsoon": { weatherSuitability: "all-season" },
  "rainy": { weatherSuitability: "all-season" },
  "all-season": { weatherSuitability: "all-season" },

  // Basic Colors
  "black": { primaryColor: "black" },
  "white": { primaryColor: "white" },
  "blue": { primaryColor: "blue" },
  "grey": { primaryColor: "grey" },
  "gray": { primaryColor: "grey" },
  "red": { primaryColor: "red" },
  "green": { primaryColor: "green" },
  "yellow": { primaryColor: "yellow" },
  "pink": { primaryColor: "pink" },
  "brown": { primaryColor: "brown" },
  "beige": { primaryColor: "beige" },
  "cream": { primaryColor: "cream" },
  "gold": { primaryColor: "gold" },
  "navy": { primaryColor: "navy" },
};
