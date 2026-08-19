import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";

const REPO_ROOT = import.meta.dir;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

interface PackageJson {
    name: string;
    description: string;
    [key: string]: unknown;
}

function readPackageJson(): PackageJson {
    return JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8"));
}

function writePackageJson(pkg: PackageJson): void {
    writeFileSync(join(REPO_ROOT, "package.json"), `${JSON.stringify(pkg, null, 4)}\n`);
}

function validateKebabCase(value: string): string | undefined {
    if (!value) return "Project name is required";
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value)) {
        return "Must be kebab-case (e.g. my-cool-project)";
    }
    return undefined;
}

function toDisplayName(kebab: string): string {
    return kebab
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("-");
}

const SECRET_PATTERNS = ["SECRET", "_KEY", "TOKEN", "PASSWORD", "PASS", "CREDENTIAL"];

function isSecretKey(key: string): boolean {
    const upper = key.toUpperCase();
    return SECRET_PATTERNS.some((pat) => upper.includes(pat));
}

interface EnvEntry {
    group: string;
    key: string;
    placeholder: string;
}

function parseEnvExample(): EnvEntry[] {
    const filePath = join(REPO_ROOT, ".env.example");
    if (!existsSync(filePath)) return [];
    const lines = readFileSync(filePath, "utf-8").split("\n");
    const entries: EnvEntry[] = [];
    let currentGroup = "General";
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("#")) {
            currentGroup = trimmed.replace(/^#\s*/, "");
            continue;
        }
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const placeholder = trimmed.slice(eqIdx + 1).trim();
        entries.push({ group: currentGroup, key, placeholder });
    }
    return entries;
}

function loadExistingEnv(): Record<string, string> {
    const filePath = join(REPO_ROOT, ".env");
    if (!existsSync(filePath)) return {};
    const result: Record<string, string> = {};
    for (const line of readFileSync(filePath, "utf-8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1);
    }
    return result;
}

const PLACEHOLDER_VALUES = new Set([
    "sk-...",
    "sk-ant-...",
    "xai-...",
    "gsk_...",
    "pplx-...",
    "AIza...",
    "csk-...",
    "sk-lf-...",
    "pk-lf-...",
    "sk_test_...",
    "ghp_...",
    "postgresql://user:pass@host:port/db",
    "https://your-project.supabase.co",
    "https://cloud.langfuse.com",
]);

function hasRealValue(value: string): boolean {
    return !!value && !PLACEHOLDER_VALUES.has(value);
}

function buildEnvOptions(
    entries: EnvEntry[],
    existing: Record<string, string>,
): { value: string; label: string; hint?: string }[] {
    const groups: Record<string, EnvEntry[]> = {};
    for (const entry of entries) {
        if (!groups[entry.group]) groups[entry.group] = [];
        groups[entry.group].push(entry);
    }
    const options: { value: string; label: string; hint?: string }[] = [];
    for (const [group, groupEntries] of Object.entries(groups)) {
        for (const entry of groupEntries) {
            const existingVal = existing[entry.key];
            const configured = existingVal && hasRealValue(existingVal);
            options.push({
                value: entry.key,
                label: entry.key,
                hint: configured ? `[${group} -configured]` : `[${group}]`,
            });
        }
    }
    return options;
}

async function promptEnvValue(
    key: string,
    entry: EnvEntry | undefined,
    existing: Record<string, string>,
): Promise<string | undefined> {
    const defaultVal =
        existing[key] && hasRealValue(existing[key]) ? existing[key] : undefined;

    if (isSecretKey(key)) {
        const val = exitIfCancelled(await p.password({ message: `${key}:` }));
        return val || undefined;
    }
    const val = exitIfCancelled(
        await p.text({
            message: `${key}:`,
            placeholder: entry?.placeholder || "",
            defaultValue: defaultVal,
            initialValue: defaultVal,
        }),
    );
    return val || undefined;
}

function writeEnvFile(existing: Record<string, string>): void {
    const exampleLines = readFileSync(join(REPO_ROOT, ".env.example"), "utf-8").split(
        "\n",
    );
    const outputLines: string[] = [];
    for (const line of exampleLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            outputLines.push(line);
            continue;
        }
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) {
            outputLines.push(line);
            continue;
        }
        const key = trimmed.slice(0, eqIdx).trim();
        const value = existing[key] ?? trimmed.slice(eqIdx + 1).trim();
        outputLines.push(`${key}=${value}`);
    }
    writeFileSync(join(REPO_ROOT, ".env"), outputLines.join("\n"));
}

function generateAsset(script: string, args: string[]): boolean {
    return runCommand(["bun", "run", script, ...args]);
}

function runCommand(cmd: string[]): boolean {
    const result = Bun.spawnSync(cmd, {
        cwd: REPO_ROOT,
        stdout: "inherit",
        stderr: "inherit",
    });
    return result.exitCode === 0;
}

function exitIfCancelled<T>(value: T | symbol): T {
    if (p.isCancel(value)) {
        p.cancel("Onboarding cancelled.");
        process.exit(0);
    }
    return value;
}

// ──────────────────────────────────────────────
// Subcommands
// ──────────────────────────────────────────────

const DEFAULT_NAME = "bun-template";
const DEFAULT_DISPLAY_NAME = "Bun-Template";
const DEFAULT_DESCRIPTION = "\u{1F95F} Agent-ergonomic opinionated Bun template";
const DEFAULT_GITHUB_REPO = "Miyamura80/Bun-Template";

async function cmdRename(): Promise<boolean> {
    p.log.step("Rename project");

    const pkg = readPackageJson();
    if (pkg.name !== DEFAULT_NAME) {
        p.log.info(`Project already renamed to "${pkg.name}" -skipping.`);
        return true;
    }

    const name = exitIfCancelled(
        await p.text({
            message: "Project name (kebab-case):",
            placeholder: "my-cool-project",
            validate: validateKebabCase,
        }),
    );

    const description = exitIfCancelled(
        await p.text({
            message: "Project description:",
            placeholder: "A short description of your project",
        }),
    );

    const githubRepo = exitIfCancelled(
        await p.text({
            message: "GitHub owner/repo (for badge URLs, leave empty to skip):",
            placeholder: "your-username/your-repo",
        }),
    );

    // Update package.json
    pkg.name = name;
    pkg.description = description || pkg.description;
    writePackageJson(pkg);
    p.log.success("Updated package.json");

    // Replace template name and description across project files
    const filesToUpdate = ["README.md", "src/index.ts", "scripts/README.md"];

    for (const relPath of filesToUpdate) {
        const filePath = join(REPO_ROOT, relPath);
        if (!existsSync(filePath)) continue;
        let content = readFileSync(filePath, "utf-8");
        const original = content;
        // Replace GitHub owner/repo in URLs (must run before name replacement)
        if (githubRepo) {
            content = content.replaceAll(DEFAULT_GITHUB_REPO, githubRepo);
        }
        content = content.replaceAll(DEFAULT_NAME, name);
        content = content.replaceAll(DEFAULT_DISPLAY_NAME, toDisplayName(name));
        if (description) {
            content = content.replaceAll(DEFAULT_DESCRIPTION, description);
        }
        if (content !== original) {
            writeFileSync(filePath, content);
            p.log.success(`Updated ${relPath}`);
        }
    }

    return true;
}

async function cmdDeps(): Promise<boolean> {
    p.log.step("Install dependencies");

    p.log.info("Running bun install...");
    const ok = runCommand(["bun", "install"]);
    if (ok) {
        p.log.success("Dependencies installed");
    } else {
        p.log.error("Failed to install dependencies");
    }
    return ok;
}

async function cmdEnv(): Promise<boolean> {
    p.log.step("Configure environment variables");

    const entries = parseEnvExample();
    if (entries.length === 0) {
        p.log.info("No .env.example found -skipping.");
        return true;
    }

    const existing = loadExistingEnv();
    const options = buildEnvOptions(entries, existing);

    const selected = exitIfCancelled(
        await p.multiselect({
            message: "Select env vars to configure (space to toggle):",
            options,
            required: false,
        }),
    );

    if (selected.length === 0) {
        p.log.info("No env vars selected -keeping existing .env.");
        return true;
    }

    for (const key of selected) {
        const entry = entries.find((e) => e.key === key);
        const val = await promptEnvValue(key, entry, existing);
        if (val) existing[key] = val;
    }

    writeEnvFile(existing);
    p.log.success("Wrote .env file");
    return true;
}

async function cmdHooks(): Promise<boolean> {
    p.log.step("Git hooks (prek)");

    const prekPath = join(REPO_ROOT, "prek.toml");
    if (!existsSync(prekPath)) {
        p.log.info("No prek.toml found -skipping.");
        return true;
    }

    // Display configured hooks
    const tomlContent = readFileSync(prekPath, "utf-8");
    const hookNames: string[] = [];
    for (const match of tomlContent.matchAll(/name\s*=\s*"([^"]+)"/g)) {
        hookNames.push(match[1]);
    }

    if (hookNames.length > 0) {
        p.note(hookNames.map((h) => `  • ${h}`).join("\n"), "Configured hooks");
    }

    const shouldInstall = exitIfCancelled(
        await p.confirm({
            message: "Install git hooks with prek?",
            initialValue: true,
        }),
    );

    if (!shouldInstall) {
        p.log.info("Skipped hook installation.");
        return true;
    }

    p.log.info("Installing prek and hooks...");
    const installOk = runCommand(["bun", "install", "-g", "@j178/prek"]);
    if (!installOk) {
        p.log.error("Failed to install prek globally");
        return false;
    }
    // Clear any existing hooksPath config
    runCommand(["git", "config", "--unset-all", "core.hooksPath"]);
    const prekOk = runCommand(["prek", "install"]);
    if (prekOk) {
        p.log.success("Git hooks installed");
    } else {
        p.log.error("Failed to install hooks");
    }
    return prekOk;
}

function hasGeminiKey(): boolean {
    const existing = loadExistingEnv();
    const geminiKey = process.env.GEMINI_API_KEY || existing.GEMINI_API_KEY;
    return !!geminiKey && hasRealValue(geminiKey);
}

function runMediaGenerators(choice: string, args: string[]): boolean {
    if (choice === "banner" || choice === "both") {
        p.log.info("Generating banner...");
        const ok = generateAsset("scripts/generate-banner.ts", args);
        if (ok) {
            p.log.success("Banner generated at media/banner.png");
        } else {
            p.log.error("Banner generation failed.");
            if (choice === "banner") return false;
        }
    }
    if (choice === "logo" || choice === "both") {
        p.log.info("Generating logo suite...");
        const ok = generateAsset("scripts/generate-logo.ts", args);
        if (ok) {
            p.log.success("Logo suite generated in docs/public/");
        } else {
            p.log.error("Logo generation failed.");
            return false;
        }
    }
    return true;
}

async function cmdMedia(): Promise<boolean> {
    p.log.step("Generate media assets");

    if (!hasGeminiKey()) {
        p.log.warn(
            "GEMINI_API_KEY not set -media generation requires a Gemini API key.",
        );
        p.log.info("Set it in .env or as an environment variable, then re-run.");
        return false;
    }

    const pkg = readPackageJson();
    const title =
        pkg.name !== DEFAULT_NAME ? toDisplayName(pkg.name) : DEFAULT_DISPLAY_NAME;

    const theme = exitIfCancelled(
        await p.text({
            message: "Visual theme / style hint (optional):",
            placeholder: "e.g. cyberpunk, nature, minimalist",
        }),
    );

    const choice = exitIfCancelled(
        await p.select({
            message: "What to generate?",
            options: [
                { value: "both", label: "Banner + Logo" },
                { value: "banner", label: "Banner only" },
                { value: "logo", label: "Logo only" },
                { value: "skip", label: "Skip" },
            ],
        }),
    );

    if (choice === "skip") {
        p.log.info("Skipped media generation.");
        return true;
    }

    return runMediaGenerators(choice, [title, theme || ""]);
}

// ──────────────────────────────────────────────
// Orchestrator
// ──────────────────────────────────────────────

interface Step {
    name: string;
    fn: () => Promise<boolean>;
}

async function orchestrator(): Promise<void> {
    const pkg = readPackageJson();
    p.intro(`Welcome to ${pkg.name} onboarding`);

    const steps: Step[] = [
        { name: "Rename project", fn: cmdRename },
        { name: "Install dependencies", fn: cmdDeps },
        { name: "Configure environment", fn: cmdEnv },
        { name: "Set up git hooks", fn: cmdHooks },
        { name: "Generate media assets", fn: cmdMedia },
    ];

    const results: { name: string; ok: boolean; skipped: boolean }[] = [];

    for (const step of steps) {
        const shouldRun = exitIfCancelled(
            await p.confirm({
                message: `Run "${step.name}"?`,
                initialValue: true,
            }),
        );

        if (!shouldRun) {
            results.push({ name: step.name, ok: true, skipped: true });
            p.log.info(`Skipped: ${step.name}`);
            continue;
        }

        try {
            const ok = await step.fn();
            results.push({ name: step.name, ok, skipped: false });
            if (!ok) {
                const cont = exitIfCancelled(
                    await p.confirm({
                        message: `"${step.name}" had issues. Continue anyway?`,
                        initialValue: true,
                    }),
                );
                if (!cont) break;
            }
        } catch (err) {
            p.log.error(`${step.name} failed: ${err}`);
            results.push({ name: step.name, ok: false, skipped: false });
            const cont = exitIfCancelled(
                await p.confirm({
                    message: "Continue with remaining steps?",
                    initialValue: true,
                }),
            );
            if (!cont) break;
        }
    }

    // Summary
    const summary = results
        .map((r) => {
            const icon = r.skipped ? "○" : r.ok ? "●" : "✗";
            const status = r.skipped ? "skipped" : r.ok ? "done" : "failed";
            return `  ${icon} ${r.name} -${status}`;
        })
        .join("\n");

    p.note(summary, "Onboarding summary");
    p.outro("Happy hacking!");
}

// ──────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────

const subcommand = process.argv[2];

switch (subcommand) {
    case "rename":
        p.intro("Rename project");
        await cmdRename();
        p.outro("Done!");
        break;
    case "deps":
        p.intro("Install dependencies");
        await cmdDeps();
        p.outro("Done!");
        break;
    case "env":
        p.intro("Configure environment");
        await cmdEnv();
        p.outro("Done!");
        break;
    case "hooks":
        p.intro("Set up git hooks");
        await cmdHooks();
        p.outro("Done!");
        break;
    case "media":
        p.intro("Generate media assets");
        await cmdMedia();
        p.outro("Done!");
        break;
    case "--help":
    case "-h":
        console.log(`Usage: bun run onboard.ts [subcommand]

Subcommands:
  rename   Rename project (package.json + README)
  deps     Install dependencies (bun install)
  env      Configure environment variables from .env.example
  hooks    Install git hooks via prek
  media    Generate banner and/or logo assets

Run without a subcommand for the full interactive onboarding flow.`);
        break;
    default:
        await orchestrator();
        break;
}
