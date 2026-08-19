import { describe, expect, test } from "bun:test";
import type { RedactionPattern } from "@/config/schemas";
import { Redactor } from "@/utils/redact";

const TEST_PATTERNS: RedactionPattern[] = [
    {
        name: "OPENAI_API_KEY",
        regex: "sk-[a-zA-Z0-9]{20,}",
        placeholder: "[REDACTED_API_KEY]",
    },
    {
        name: "ANTHROPIC_API_KEY",
        regex: "sk-ant-[a-zA-Z0-9-]{20,}",
        placeholder: "[REDACTED_API_KEY]",
    },
    {
        name: "STRIPE_API_KEY",
        regex: "[spr]k_(live|test)_[a-zA-Z0-9]{20,}",
        placeholder: "[REDACTED_API_KEY]",
    },
    {
        name: "BEARER_TOKEN",
        regex: "Bearer\\s+[a-zA-Z0-9._\\-]{20,}",
        placeholder: "[REDACTED_BEARER_TOKEN]",
    },
];

describe("Redactor", () => {
    const redactor = new Redactor(TEST_PATTERNS);

    test("redacts OpenAI API keys", () => {
        const key = "sk-abc123def456ghi789jkl012mno345pqr678stu901";
        const result = redactor.redact(`Using key: ${key}`);
        expect(result).not.toContain(key);
        expect(result).toContain("[REDACTED_API_KEY]");
    });

    test("redacts Anthropic API keys", () => {
        const key = "sk-ant-api03-abcdef1234567890abcdef";
        const result = redactor.redact(`Key is ${key} here`);
        expect(result).not.toContain(key);
        expect(result).toContain("[REDACTED_API_KEY]");
    });

    test("redacts Stripe API keys", () => {
        const key = "sk_live_abc123def456ghi789jkl";
        const result = redactor.redact(`Stripe: ${key}`);
        expect(result).not.toContain(key);
        expect(result).toContain("[REDACTED_API_KEY]");
    });

    test("redacts Bearer tokens", () => {
        const token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
        const result = redactor.redact(`Auth: ${token}`);
        expect(result).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
        expect(result).toContain("[REDACTED_BEARER_TOKEN]");
    });

    test("leaves non-sensitive text unchanged", () => {
        const text = "Hello world, this is a normal message.";
        expect(redactor.redact(text)).toBe(text);
    });

    test("handles multiple secrets in one string", () => {
        const text =
            "Keys: sk-abc123def456ghi789jkl012 and sk-ant-api03-xyz789abc123def456";
        const result = redactor.redact(text);
        expect(result).not.toContain("sk-abc123def456ghi789jkl012");
        expect(result).not.toContain("sk-ant-api03-xyz789abc123def456");
    });

    test("returns text as-is when disabled", () => {
        const disabled = new Redactor(TEST_PATTERNS, false);
        const key = "sk-abc123def456ghi789jkl012mno345pqr678stu901";
        expect(disabled.redact(key)).toBe(key);
    });
});
