import { globalConfig } from "@/config";
import { GoogleGenAI, type Part } from "@google/genai";

export function createGeminiClient(): GoogleGenAI {
    const apiKey = globalConfig.geminiApiKey;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set. Add it to your .env file.");
    }
    return new GoogleGenAI({ apiKey });
}

export async function generateText(
    client: GoogleGenAI,
    model: string,
    prompt: string,
): Promise<string> {
    const response = await client.models.generateContent({
        model,
        contents: prompt,
    });
    const text = response.candidates?.[0]?.content?.parts
        ?.filter((p: Part) => p.text)
        .map((p: Part) => p.text)
        .join("");
    if (!text) {
        throw new Error("No text in Gemini response");
    }
    return text;
}

export async function generateImage(
    client: GoogleGenAI,
    model: string,
    contents: string | Part[],
    options?: { aspectRatio?: string; imageSize?: string },
): Promise<Buffer> {
    const response = await client.models.generateContent({
        model,
        contents,
        config: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
                aspectRatio: options?.aspectRatio,
                imageSize: options?.imageSize,
            },
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
            return Buffer.from(part.inlineData.data, "base64");
        }
    }
    throw new Error("No image data in Gemini response");
}
