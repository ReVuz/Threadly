import { readFile } from "@tauri-apps/plugin-fs";
import { z } from "zod";

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

  // 2. Call Gemini 2.5 Flash API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
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
    const errorText = await response.text();
    throw new Error(`Gemini API call failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  // Extract text response
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
