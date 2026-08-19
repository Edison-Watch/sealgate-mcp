import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { type Config, ConfigSchema } from "./schemas";
import {
    coerceValue,
    envKeyToCamel,
    recursiveKeyTransform,
    recursiveUpdate,
    snakeToCamel,
} from "./utils";

// Only env vars starting with these prefixes (before __) are treated as config overrides.
// This prevents system env vars like __CF_USER_TEXT_ENCODING from polluting the config.
const CONFIG_ENV_PREFIXES = new Set(
    Object.keys(ConfigSchema.shape).map((k) => k.toLowerCase()),
);

const ROOT_DIR = resolve(import.meta.dir, "../..");
const CONFIG_DIR = import.meta.dir;

const RESERVED_YAML_FILES = new Set([
    "global-config.yaml",
    "production-config.yaml",
    ".global-config.yaml",
]);

function loadYamlFile(path: string): Record<string, unknown> {
    const text = readFileSync(path, "utf-8");
    return (parseYaml(text) as Record<string, unknown>) ?? {};
}

function loadYamlFiles(): Record<string, unknown> {
    const basePath = join(CONFIG_DIR, "global-config.yaml");
    if (!existsSync(basePath)) {
        throw new Error(`Required config file not found: ${basePath}`);
    }
    const config = loadYamlFile(basePath);

    // Load split YAML files from config directory
    const files = readdirSync(CONFIG_DIR).filter(
        (f) => f.endsWith(".yaml") && !RESERVED_YAML_FILES.has(f),
    );
    for (const file of files.sort()) {
        const rootKey = file.replace(/\.yaml$/, "");
        if (rootKey in config) {
            throw new Error(
                `Config conflict: key '${rootKey}' from '${file}' already exists in global-config.yaml`,
            );
        }
        const data = parseYaml(readFileSync(join(CONFIG_DIR, file), "utf-8"));
        if (data != null) {
            config[rootKey] = data;
        }
    }

    // Production overlay
    if (process.env.DEV_ENV === "prod") {
        const prodPath = join(CONFIG_DIR, "production-config.yaml");
        if (existsSync(prodPath)) {
            const prodConfig = loadYamlFile(prodPath);
            recursiveUpdate(config, prodConfig);
        }
    }

    // Local override (highest YAML priority)
    const localOverridePath = join(ROOT_DIR, ".global-config.yaml");
    if (existsSync(localOverridePath)) {
        const localConfig = loadYamlFile(localOverridePath);
        recursiveUpdate(config, localConfig);
    }

    return config;
}

function applyEnvOverrides(config: Record<string, unknown>): Record<string, unknown> {
    for (const [key, rawValue] of Object.entries(process.env)) {
        if (!key.includes("__") || rawValue === undefined) continue;

        const parts = key.split("__").map(envKeyToCamel);
        const head = parts[0];
        const leaf = parts.at(-1);
        // Skip env vars whose top-level key isn't a known config field
        if (head === undefined || leaf === undefined) continue;
        if (!CONFIG_ENV_PREFIXES.has(head.toLowerCase())) continue;
        let target = config;
        for (const part of parts.slice(0, -1)) {
            if (typeof target[part] !== "object" || target[part] === null) {
                target[part] = {};
            }
            target = target[part] as Record<string, unknown>;
        }
        target[leaf] = coerceValue(rawValue);
    }
    return config;
}

/** Create a fresh Config instance. Useful for testing with different env vars. */
export function createConfig(): Config {
    const rawYaml = loadYamlFiles();
    const camelCased = recursiveKeyTransform(rawYaml, snakeToCamel) as Record<
        string,
        unknown
    >;

    // Inject env var overrides for direct-mapped fields
    if (process.env.DEV_ENV) {
        camelCased.devEnv = process.env.DEV_ENV;
    }
    camelCased.openaiApiKey = process.env.OPENAI_API_KEY;
    camelCased.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    camelCased.groqApiKey = process.env.GROQ_API_KEY;
    camelCased.perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    camelCased.geminiApiKey = process.env.GEMINI_API_KEY;

    // Runtime computed
    camelCased.isLocal = process.env.GITHUB_ACTIONS !== "true";
    camelCased.runningOn = process.env.GITHUB_ACTIONS !== "true" ? "local" : "CI";

    // Apply nested env var overrides (highest priority)
    applyEnvOverrides(camelCased);

    return ConfigSchema.parse(camelCased);
}

export const globalConfig: Config = createConfig();
