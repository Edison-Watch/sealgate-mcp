import type { RedactionPattern } from "@/config/schemas";

export class Redactor {
    private enabled: boolean;
    private combinedRegex: RegExp | null = null;
    private placeholderMap: Map<string, string> = new Map();

    constructor(patterns: RedactionPattern[], enabled = true) {
        this.enabled = enabled;
        if (enabled && patterns.length > 0) {
            const parts = patterns.map((p, i) => {
                const groupName = `p${i}`;
                this.placeholderMap.set(groupName, p.placeholder);
                return `(?<${groupName}>${p.regex})`;
            });
            this.combinedRegex = new RegExp(parts.join("|"), "g");
        }
    }

    redact(text: string): string {
        if (!this.enabled || !this.combinedRegex) return text;
        // Reset lastIndex for global regex
        this.combinedRegex.lastIndex = 0;
        return text.replace(this.combinedRegex, (...args: unknown[]) => {
            const groups = args[args.length - 1] as Record<string, string>;
            for (const [groupName, value] of Object.entries(groups)) {
                if (value !== undefined) {
                    return this.placeholderMap.get(groupName) ?? "[REDACTED]";
                }
            }
            return "[REDACTED]";
        });
    }
}
