import { describe, expect, test } from "bun:test";
import { coerceValue, snakeToCamel } from "@/config/utils";

describe("coerceValue", () => {
    test("coerces 'true' to boolean true", () => {
        expect(coerceValue("true")).toBe(true);
    });

    test("coerces 'false' to boolean false", () => {
        expect(coerceValue("false")).toBe(false);
    });

    test("coerces integer strings to numbers", () => {
        expect(coerceValue("50000")).toBe(50000);
        expect(coerceValue("0")).toBe(0);
        expect(coerceValue("-1")).toBe(-1);
    });

    test("coerces float strings to numbers", () => {
        expect(coerceValue("0.7")).toBe(0.7);
        expect(coerceValue("-3.14")).toBe(-3.14);
    });

    test("leaves non-numeric strings as strings", () => {
        expect(coerceValue("hello")).toBe("hello");
        expect(coerceValue("gemini/gemini-3-flash")).toBe("gemini/gemini-3-flash");
    });
});

describe("snakeToCamel", () => {
    test("converts snake_case to camelCase", () => {
        expect(snakeToCamel("default_max_tokens")).toBe("defaultMaxTokens");
        expect(snakeToCamel("show_for_info")).toBe("showForInfo");
    });

    test("handles single words", () => {
        expect(snakeToCamel("verbose")).toBe("verbose");
    });

    test("handles UPPER_CASE env keys", () => {
        expect(snakeToCamel("DEV_ENV")).toBe("DEV_ENV");
    });
});
