import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeClothingImage, GeminiResponseSchema } from "../lib/gemini";
import { readFile } from "@tauri-apps/plugin-fs";

// Mock Tauri FS readFile
vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));

// Mock window.btoa (global.btoa in node)
global.btoa = vi.fn().mockReturnValue("base64-mock-data");

describe("Gemini API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup env variable mock
    import.meta.env.VITE_GEMINI_API_KEY = "test-api-key-12345";
  });

  it("sends request to Gemini 2.5 Flash and returns parsed validated results", async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  type: "top",
                  primaryColor: "White",
                  secondaryColor: null,
                  pattern: "solid",
                  material: "linen",
                  fit: "relaxed",
                  formality: "casual",
                  sleeveLength: "long",
                  neckline: "collar",
                  weatherSuitability: "warm-weather",
                  suggestedName: "Classic White Linen Shirt",
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const result = await analyzeClothingImage("/path/to/processed/item.webp");

    expect(readFile).toHaveBeenCalledWith("/path/to/processed/item.webp");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-api-key-12345"),
      expect.any(Object)
    );

    expect(result).toEqual({
      type: "top",
      primaryColor: "White",
      secondaryColor: null,
      pattern: "solid",
      material: "linen",
      fit: "relaxed",
      formality: "casual",
      sleeveLength: "long",
      neckline: "collar",
      weatherSuitability: "warm-weather",
      suggestedName: "Classic White Linen Shirt",
    });
  });

  it("throws error if API returns bad status", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "API Key invalid",
    } as Response);

    await expect(analyzeClothingImage("/path/to/image.png")).rejects.toThrow(
      "Gemini API call failed with status 400"
    );
  });
});
