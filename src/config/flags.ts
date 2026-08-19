import type { Config } from "./schemas";

/** Get a feature flag value from config (env overrides are already applied by the config loader). */
export function getFlag(
    config: Config,
    flagName: string,
    defaultValue = false,
): boolean {
    const configVal = config.features[flagName];
    if (typeof configVal === "boolean") return configVal;
    if (typeof configVal === "number") return configVal === 1;
    if (typeof configVal === "string") return configVal === "true" || configVal === "1";
    return defaultValue;
}
