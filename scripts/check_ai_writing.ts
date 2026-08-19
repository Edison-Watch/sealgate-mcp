import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..");
const EM_DASH = "\u2014";

const ROOT_SKIP_DIRS = new Set([
    ".git",
    ".cache",
    ".next",
    "node_modules",
    "dist",
    "out",
    "build",
    "coverage",
]);

const RECURSIVE_SKIP_DIRS = new Set(["node_modules", ".next"]);

const SKIP_PATH_PREFIXES = [
    ["docs", ".next"],
    ["docs", "node_modules"],
    ["frontend", "node_modules"],
];

const SKIP_SUFFIXES = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".svg",
    ".mp4",
    ".mov",
    ".mp3",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".bz2",
    ".7z",
    ".bin",
    ".db",
    ".lock",
]);

function shouldSkipDir(name: string, parts: string[]): boolean {
    if (parts.length === 1 && ROOT_SKIP_DIRS.has(name)) return true;
    if (RECURSIVE_SKIP_DIRS.has(name)) return true;
    return SKIP_PATH_PREFIXES.some(
        (prefix) =>
            parts.length >= prefix.length && prefix.every((p, i) => parts[i] === p),
    );
}

async function* iterTextFiles(root: string): AsyncGenerator<string> {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = join(root, entry.name);
        const parts = relative(REPO_ROOT, fullPath).split("/");

        if (entry.isDirectory()) {
            if (!shouldSkipDir(entry.name, parts)) {
                yield* iterTextFiles(fullPath);
            }
        } else if (entry.isFile()) {
            if (!SKIP_SUFFIXES.has(extname(entry.name).toLowerCase())) {
                yield fullPath;
            }
        }
    }
}

function findEmDashes(text: string): Array<{ lineno: number; line: string }> {
    const results: Array<{ lineno: number; line: string }> = [];
    const lines = text.split("\n");
    for (const [i, line] of lines.entries()) {
        if (line.includes(EM_DASH)) {
            results.push({ lineno: i + 1, line: line.trim() });
        }
    }
    return results;
}

async function main(): Promise<number> {
    const violations: Array<{
        relPath: string;
        lineno: number;
        snippet: string;
    }> = [];

    for await (const filePath of iterTextFiles(REPO_ROOT)) {
        let text: string;
        try {
            text = await readFile(filePath, "utf-8");
        } catch {
            continue;
        }
        for (const { lineno, line } of findEmDashes(text)) {
            violations.push({
                relPath: relative(REPO_ROOT, filePath),
                lineno,
                snippet: line,
            });
        }
    }

    if (violations.length > 0) {
        console.log(
            `AI writing check failed: '${EM_DASH}' (em dash) detected in the repository`,
        );
        for (const { relPath, lineno, snippet } of violations) {
            console.log(`${relPath}:${lineno}: ${snippet}`);
        }
        console.log("Please remove the em dash or explain why it is acceptable.");
        return 1;
    }

    console.log("AI writing check passed (no em dash found).");
    return 0;
}

process.exit(await main());
