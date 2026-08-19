import type { Config } from "./schemas";

const OPENAI_O_SERIES_PATTERN = /^o(\d+)(-[\w-]+)?$/;

export function identifyProvider(modelName: string): string {
    const lower = modelName.toLowerCase();
    if (lower.includes("gpt") || OPENAI_O_SERIES_PATTERN.test(lower)) return "openai";
    if (lower.includes("claude") || lower.includes("anthropic")) return "anthropic";
    if (lower.includes("groq")) return "groq";
    if (lower.includes("perplexity")) return "perplexity";
    if (lower.includes("gemini")) return "gemini";
    return "unknown";
}

export function getLlmApiKey(config: Config, modelName?: string): string {
    const identifier = modelName ?? config.modelName;
    const provider = identifyProvider(identifier);
    const keyMap: Record<string, string | undefined> = {
        openai: config.openaiApiKey,
        anthropic: config.anthropicApiKey,
        groq: config.groqApiKey,
        perplexity: config.perplexityApiKey,
        gemini: config.geminiApiKey,
    };
    const key = keyMap[provider];
    if (!key) {
        throw new Error(
            `API key for provider '${provider}' is not configured. ` +
                `Set ${provider.toUpperCase()}_API_KEY in your .env file.`,
        );
    }
    return key;
}
