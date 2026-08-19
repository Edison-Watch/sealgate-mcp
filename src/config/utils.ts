/** Convert a snake_case string to camelCase. */
export function snakeToCamel(str: string): string {
    return str.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

/** Convert an UPPER_SNAKE_CASE or snake_case string to camelCase. */
export function envKeyToCamel(str: string): string {
    return snakeToCamel(str.toLowerCase());
}

/** Recursively transform all keys in an object using the given function. */
export function recursiveKeyTransform(
    obj: unknown,
    transform: (key: string) => string,
): unknown {
    if (Array.isArray(obj)) {
        return obj.map((item) => recursiveKeyTransform(item, transform));
    }
    if (obj !== null && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[transform(key)] = recursiveKeyTransform(value, transform);
        }
        return result;
    }
    return obj;
}

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Deep merge override into base (mutates base). */
export function recursiveUpdate(
    base: Record<string, unknown>,
    override: Record<string, unknown>,
): Record<string, unknown> {
    for (const [key, value] of Object.entries(override)) {
        if (UNSAFE_KEYS.has(key)) continue;
        if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            typeof base[key] === "object" &&
            base[key] !== null &&
            !Array.isArray(base[key])
        ) {
            recursiveUpdate(
                base[key] as Record<string, unknown>,
                value as Record<string, unknown>,
            );
        } else {
            base[key] = value;
        }
    }
    return base;
}

/** Coerce a string environment variable value to the appropriate JS type. */
export function coerceValue(value: string): string | number | boolean {
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value);
    return value;
}
