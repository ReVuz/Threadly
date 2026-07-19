import { readFile } from "@tauri-apps/plugin-fs";
import { z } from "zod";

// Gemini model — gemini-3-flash-preview is available under this API key's quota
const GEMINI_MODEL = "gemini-3-flash-preview";

// Zod schema for validating the Gemini response
export const GeminiResponseSchema = z.object({
  type: z.enum(["dress", "top", "bottom", "jacket", "co-ord", "ethnic", "other"]),
  primaryColor: z.string(),
  secondaryColor: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  fit: z.string().nullable().optional(),
  formality: z.enum(["casual", "smart-casual", "formal", "festive", "loungewear"]),
  sleeveLength: z.string().nullable().optional(),
  neckline: z.string().nullable().optional(),
  weatherSuitability: z.enum(["warm-weather", "cold-weather", "all-season"]),
  suggestedName: z.string(),
});

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

// Helper function to safely convert Uint8Array to base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Analyzes a local image using the Gemini 2.5 Flash API and structured outputs.
 * Reads the file, base64 encodes it, sends it to Gemini, and validates the response.
 */
export async function analyzeClothingImage(filePath: string): Promise<GeminiResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not defined in environment variables");
  }

  // 1. Read the image file from local path using Tauri FS plugin
  const imageBytes = await readFile(filePath);
  const base64Data = uint8ArrayToBase64(imageBytes);

  // Determine MIME type from extension
  const ext = filePath.split(".").pop()?.toLowerCase() || "webp";
  const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;

  // 2. Call Gemini API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Analyze this clothing item in detail. Classify its category and attributes.
Provide a clean, elegant, luxury editorial name for the item in the 'suggestedName' property (e.g. "Ivory Silk Blouse", "Indigo Denim Trouser").
Return only the matching values conforming to the requested schema.`,
          },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          type: { 
            type: "STRING", 
            enum: ["dress", "top", "bottom", "jacket", "co-ord", "ethnic", "other"] 
          },
          primaryColor: { type: "STRING" },
          secondaryColor: { type: "STRING" },
          pattern: { type: "STRING" },
          material: { type: "STRING" },
          fit: { type: "STRING" },
          formality: { 
            type: "STRING", 
            enum: ["casual", "smart-casual", "formal", "festive", "loungewear"] 
          },
          sleeveLength: { type: "STRING" },
          neckline: { type: "STRING" },
          weatherSuitability: { 
            type: "STRING", 
            enum: ["warm-weather", "cold-weather", "all-season"] 
          },
          suggestedName: { type: "STRING" },
        },
        required: [
          "type",
          "primaryColor",
          "formality",
          "weatherSuitability",
          "suggestedName"
        ],
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.error?.message || `HTTP ${response.status}`;
    if (response.status === 404) {
      throw new Error(`Gemini model '${GEMINI_MODEL}' not available for this API key. Error: ${errorMessage}`);
    }
    if (response.status === 429) {
      throw new Error(`Gemini API quota exceeded — check billing at https://ai.dev/rate-limit. Error: ${errorMessage}`);
    }
    throw new Error(`Gemini API call failed (${response.status}): ${errorMessage}`);
  }

  const result = await response.json();
  
  // Extract response — when responseMimeType is application/json, text field contains a JSON string
  const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error("Empty response received from Gemini API");
  }

  // 3. Parse and validate JSON output using Zod
  try {
    const parsedJson = JSON.parse(responseText);
    return GeminiResponseSchema.parse(parsedJson);
  } catch (err: any) {
    console.error("Gemini response parse/validation failed. Raw text:", responseText, err);
    throw new Error(`Failed to parse/validate Gemini response: ${err.message}`);
  }
}

export const GapAnalysisSchema = z.object({
  colorBalance: z.array(z.object({ color: z.string(), percentage: z.number() })),
  colorFeedback: z.string(),
  occasions: z.array(z.object({ name: z.string(), rating: z.number() })), // 1 to 5
  occasionFeedback: z.string(),
  missingEssentials: z.array(z.object({ item: z.string(), owned: z.number(), recommended: z.number() })),
  essentialsFeedback: z.string(),
  outfitUnlockEstimate: z.string(),
});

export type GapAnalysisResponse = z.infer<typeof GapAnalysisSchema>;

/**
 * Generates an AI-powered wardrobe gap analysis using the Gemini 2.5 Flash API.
 * Takes the list of wardrobe items, prompts Gemini, and returns a structured gap report.
 */
export async function generateGapAnalysis(
  clothesList: Array<{
    type: string | null;
    primaryColor: string | null;
    formality: string | null;
    material: string | null;
    pattern: string | null;
  }>
): Promise<GapAnalysisResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not defined in environment variables");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Perform a wardrobe gap analysis on the following user clothing items:
${JSON.stringify(clothesList, null, 2)}

Provide color distribution percentages, occasion coverage ratings (1 to 5 stars), and missing essentials.
Give actionable, specific suggestions (e.g. recommend buying a navy blazer, Kerala Kasavu Saree, or white sneakers) and estimate how many combinations they unlock.
Return only matching values conforming to the requested schema.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          colorBalance: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                color: { type: "STRING" },
                percentage: { type: "NUMBER" },
              },
              required: ["color", "percentage"],
            },
          },
          colorFeedback: { type: "STRING" },
          occasions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                rating: { type: "NUMBER" },
              },
              required: ["name", "rating"],
            },
          },
          occasionFeedback: { type: "STRING" },
          missingEssentials: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                item: { type: "STRING" },
                owned: { type: "NUMBER" },
                recommended: { type: "NUMBER" },
              },
              required: ["item", "owned", "recommended"],
            },
          },
          essentialsFeedback: { type: "STRING" },
          outfitUnlockEstimate: { type: "STRING" },
        },
        required: [
          "colorBalance",
          "colorFeedback",
          "occasions",
          "occasionFeedback",
          "missingEssentials",
          "essentialsFeedback",
          "outfitUnlockEstimate"
        ],
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.error?.message || `HTTP ${response.status}`;
    if (response.status === 404) {
      throw new Error(`Gemini model '${GEMINI_MODEL}' not available for this API key. Error: ${errorMessage}`);
    }
    if (response.status === 429) {
      throw new Error(`Gemini API quota exceeded — check billing at https://ai.dev/rate-limit. Error: ${errorMessage}`);
    }
    throw new Error(`Gemini API call failed (${response.status}): ${errorMessage}`);
  }

  const result = await response.json();
  const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error("Empty response received from Gemini API");
  }

  try {
    const parsedJson = JSON.parse(responseText);
    return GapAnalysisSchema.parse(parsedJson);
  } catch (err: any) {
    console.error("Gap analysis parse failed. Raw text:", responseText, err);
    throw new Error(`Failed to parse/validate Gap analysis response: ${err.message}`);
  }
}
