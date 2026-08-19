import { describe, expect, test } from "bun:test";

describe("Template", () => {
    test("sanity check", () => {
        expect(true).toBe(true);
    });

    test("bun runtime is available", () => {
        expect(typeof Bun).toBe("object");
    });
});
