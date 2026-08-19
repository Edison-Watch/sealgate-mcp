#!/usr/bin/env bun
/**
 * Sync Claude <-> Codex skills and subagents.
 *
 * - Symlinks `.claude/skills/<name>` -> `../../.agents/skills/<name>` for every
 *   directory under `.agents/skills/`.
 * - Regenerates `.codex/agents/<name>.toml` from each `.claude/agents/<name>.md`.
 * - Auto-prunes dangling symlinks and orphaned TOMLs silently.
 */

import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    readlinkSync,
    realpathSync,
    symlinkSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHARED_SKILLS = join(REPO, ".agents", "skills");
const CLAUDE_SKILLS = join(REPO, ".claude", "skills");
const CLAUDE_AGENTS = join(REPO, ".claude", "agents");
const CODEX_AGENTS = join(REPO, ".codex", "agents");
// Canonical repo root, used to prove that no path component (including a
// symlinked parent directory) redirects a generated-TOML write outside the tree.
const REPO_REAL = realpathSync(REPO);

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const CLAUDE_ONLY_KEYS = new Set([
    "tools",
    "model",
    "color",
    "allowed-tools",
    "disable-model-invocation",
]);

const SHARED_SKILL_FORBIDDEN_KEYS = new Set([
    "allowed-tools",
    "disable-model-invocation",
    "user-invocable",
    "context",
    "agent",
    "model",
    "effort",
    "hooks",
    "paths",
    "shell",
    "argument-hint",
]);

// The documented shared-skill frontmatter contract: only these two keys are
// allowed. Anything else (Claude-only or simply unrecognized) is rejected.
const SHARED_SKILL_ALLOWED_KEYS = new Set(["name", "description"]);
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKILL_NAME_MAX = 64;
const SKILL_DESCRIPTION_MAX = 250;

// TOML forbids all control chars except tab (U+0009) in basic strings and, for
// multiline basic strings, tab plus the newline chars (U+000A / U+000D). This
// regex matches every other control char (U+0000-U+001F and U+007F) that must
// be encoded as \uHHHH; \t, \n, and \r are excluded so their dedicated escapes
// (or literal newlines in multiline strings) survive.
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matches TOML-forbidden control chars so they can be escaped
const TOML_FORBIDDEN_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function escapeTomlControlChars(s: string): string {
    return s.replace(
        TOML_FORBIDDEN_CONTROL_RE,
        (c) => `\\u${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
    );
}

const SHARED_SKILL_FORBIDDEN_BODY_PATTERNS: [RegExp, string][] = [
    [/\$ARGUMENTS\b/, "$ARGUMENTS substitution"],
    [/\$[1-9][0-9]*\b/, "positional arg substitution ($1, $2, ...)"],
    [/\$\{CLAUDE_[A-Z_]+\}/, "${CLAUDE_*} interpolation"],
    [/!`[^`]+`/, "!`cmd` shell preprocessing"],
];
const SHARED_SKILL_RAW_BODY_PATTERNS: [RegExp, string][] = [
    [/^```!\s*$/m, "```! shell preprocessing block"],
];

type Frontmatter = Record<string, unknown>;

function rel(p: string): string {
    return relative(REPO, p);
}

function die(msg: string): never {
    console.error(msg);
    process.exit(1);
}

// Guard against a committed symlink at a generated-TOML path redirecting our
// read/write outside the repo. `lstatSync` does not follow the link, so we can
// detect it and refuse rather than clobbering whatever it points at.
function assertRegularFileOrAbsent(path: string): void {
    let st: ReturnType<typeof lstatSync>;
    try {
        st = lstatSync(path);
    } catch {
        return; // absent -- a fresh regular file will be created
    }
    if (st.isSymbolicLink()) {
        die(
            `ERROR: ${rel(path)} is a symlink; refusing to follow it. Generated Codex TOML must be a regular file. Remove the symlink and re-run.`,
        );
    }
}

// Refuse to operate under a directory whose path escapes the repo through a
// symlinked component. `assertRegularFileOrAbsent` only inspects the final path
// element, so a symlinked PARENT (e.g. `.codex` or `.codex/agents` pointing
// outside the tree) could still redirect a write out of the repo. Walk every
// existing component from the repo root down to `dir`; if any is a symlink whose
// real target lands outside the repo, abort. Absent components are fine --
// `mkdirSync` will create ordinary directories for them.
function assertDirInsideRepo(dir: string): void {
    const relPath = relative(REPO, dir);
    if (relPath === "") return;
    if (relPath.startsWith("..") || resolve(REPO, relPath) !== dir) {
        die(`ERROR: ${dir} is outside the repo root; refusing to continue.`);
    }
    let current = REPO;
    for (const part of relPath.split(sep).filter(Boolean)) {
        current = join(current, part);
        let st: ReturnType<typeof lstatSync>;
        try {
            st = lstatSync(current);
        } catch {
            return; // component absent -- mkdirSync will create a real directory
        }
        if (st.isSymbolicLink()) {
            const real = realpathSync(current);
            if (real !== REPO_REAL && !real.startsWith(REPO_REAL + sep)) {
                die(
                    `ERROR: ${rel(current)} is a symlink escaping the repo root (resolves to ${real}); refusing to read/write generated TOML beneath it. Remove the symlink and re-run.`,
                );
            }
        }
    }
}

function parseMd(path: string): { meta: Frontmatter; body: string } {
    const text = readFileSync(path, "utf-8");
    const m = text.match(FRONTMATTER_RE);
    if (!m) die(`${path}: missing YAML frontmatter`);
    const meta = (parseYaml(m[1] ?? "") as Frontmatter) ?? {};
    const body = (m[2] ?? "").replace(/^[\r\n]+/, "");
    return { meta, body };
}

function tomlBasicString(s: string): string {
    // Only used for `name` and `description`. Escape backslash, quote, and the
    // whitespace escapes, then encode every remaining TOML-forbidden control
    // char (U+0000-U+001F except \t/\n/\r, plus U+007F) as \uHHHH so a stray
    // control char can never produce invalid TOML.
    const escaped = escapeTomlControlChars(
        s
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\t/g, "\\t")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n"),
    );
    return `"${escaped}"`;
}

function tomlMultilineString(s: string): string {
    // Triple-quoted; escape sequences of 3+ double quotes so the string can't
    // close prematurely. A literal `"""` becomes `""\"`. Tab and newlines are
    // legal in a multiline basic string, but other control chars (e.g.
    // form-feed U+000C, vertical-tab U+000B) are not, so encode them as \uHHHH.
    const escaped = escapeTomlControlChars(s.replace(/\\/g, "\\\\")).replace(
        /"""/g,
        '""\\"',
    );
    // Leading newline right after the opening """ is stripped by TOML, so add one
    // so the content starts on its own line for readability.
    return `"""\n${escaped}"""`;
}

function renderToml(meta: Frontmatter, body: string, source: string): string {
    if (!meta.name) die(`${source}: missing \`name\` in frontmatter`);
    const name = String(meta.name);
    const description = String(meta.description ?? "");
    const instructions = `${body.replace(/\s+$/, "")}\n`;

    let out = "";
    out += `name = ${tomlBasicString(name)}\n`;
    out += `description = ${tomlBasicString(description)}\n`;
    out += `developer_instructions = ${tomlMultilineString(instructions)}\n`;

    const extras = Object.entries(meta).filter(([k]) => CLAUDE_ONLY_KEYS.has(k));
    if (extras.length > 0) {
        out +=
            "\n# Claude-only frontmatter (preserved for reference, not used by Codex):\n";
        for (const [k, v] of extras) {
            out += `# ${k} = ${JSON.stringify(v)}\n`;
        }
    }
    return out;
}

function scanBacktickSpan(
    t: string,
    i: number,
    precededByBang: boolean,
): { emit: string; next: number } {
    const n = t.length;
    let run = 0;
    while (i + run < n && t[i + run] === "`") run++;
    const closer = "`".repeat(run);
    const close = t.indexOf(closer, i + run);
    const unterminated = close === -1 || t.slice(i + run, close).includes("\n");
    if (unterminated) {
        return { emit: t.slice(i, i + run), next: i + run };
    }
    if (precededByBang && run === 1) {
        // Preserve `!`cmd`` verbatim so the shell-preprocessing pattern still matches.
        return { emit: t.slice(i, close + run), next: close + run };
    }
    return { emit: "", next: close + run };
}

function stripCode(text: string): string {
    const t = text.replace(/^[ ]{0,3}(`{3,})[\s\S]*?^[ ]{0,3}\1`*/gm, "");
    const out: string[] = [];
    let i = 0;
    while (i < t.length) {
        if (t[i] === "`") {
            const precededByBang = out.length > 0 && out[out.length - 1] === "!";
            const { emit, next } = scanBacktickSpan(t, i, precededByBang);
            if (emit) out.push(emit);
            i = next;
        } else {
            out.push(t.charAt(i));
            i++;
        }
    }
    return out.join("");
}

// Frontmatter allowlist: only `name` and `description` are permitted. Report
// Claude-only keys with a targeted message, then reject any other key not on the
// allowlist -- don't rely on the forbidden-key list alone.
function validateSkillKeys(label: string, meta: Frontmatter): string[] {
    const errs: string[] = [];
    const keys = Object.keys(meta);
    const claudeOnly = keys.filter((k) => SHARED_SKILL_FORBIDDEN_KEYS.has(k)).sort();
    if (claudeOnly.length > 0) {
        errs.push(
            `${label}: Claude-only frontmatter keys in shared skill: [${claudeOnly.map((k) => `'${k}'`).join(", ")}]`,
        );
    }
    const unknown = keys
        .filter(
            (k) =>
                !SHARED_SKILL_ALLOWED_KEYS.has(k) &&
                !SHARED_SKILL_FORBIDDEN_KEYS.has(k),
        )
        .sort();
    if (unknown.length > 0) {
        errs.push(
            `${label}: unexpected frontmatter keys in shared skill (only 'name' and 'description' allowed): [${unknown.map((k) => `'${k}'`).join(", ")}]`,
        );
    }
    return errs;
}

function validateSkillBody(label: string, body: string): string[] {
    const errs: string[] = [];
    for (const [pat, patLabel] of SHARED_SKILL_RAW_BODY_PATTERNS) {
        if (pat.test(body))
            errs.push(`${label}: body uses Claude-only feature: ${patLabel}`);
    }
    const scan = stripCode(body);
    for (const [pat, patLabel] of SHARED_SKILL_FORBIDDEN_BODY_PATTERNS) {
        if (pat.test(scan))
            errs.push(`${label}: body uses Claude-only feature: ${patLabel}`);
    }
    return errs;
}

// `name`: required lowercase-hyphen slug, <=64 chars.
function validateSkillName(label: string, name: unknown): string[] {
    if (name === undefined || name === null || name === "") {
        return [`${label}: missing \`name\` in frontmatter`];
    }
    if (typeof name !== "string") return [`${label}: \`name\` must be a string`];
    if (!SKILL_NAME_RE.test(name)) {
        return [`${label}: \`name\` must be a lowercase-hyphen slug (got '${name}')`];
    }
    if (name.length > SKILL_NAME_MAX) {
        return [
            `${label}: \`name\` must be <=${SKILL_NAME_MAX} chars (got ${name.length})`,
        ];
    }
    return [];
}

// `description`: required string, <=250 chars.
function validateSkillDescription(label: string, description: unknown): string[] {
    if (description === undefined || description === null || description === "") {
        return [`${label}: missing \`description\` in frontmatter`];
    }
    if (typeof description !== "string") {
        return [`${label}: \`description\` must be a string`];
    }
    if (description.length > SKILL_DESCRIPTION_MAX) {
        return [
            `${label}: \`description\` must be <=${SKILL_DESCRIPTION_MAX} chars (got ${description.length})`,
        ];
    }
    return [];
}

function validateSharedSkill(skillDir: string): string[] {
    const skillMd = join(skillDir, "SKILL.md");
    if (!existsSync(skillMd)) {
        return [`${rel(skillDir)}: missing SKILL.md`];
    }
    let parsed: { meta: Frontmatter; body: string };
    try {
        parsed = parseMd(skillMd);
    } catch (e) {
        return [String(e)];
    }
    const { meta, body } = parsed;
    const label = rel(skillMd);
    return [
        ...validateSkillKeys(label, meta),
        ...validateSkillBody(label, body),
        ...validateSkillName(label, meta.name),
        ...validateSkillDescription(label, meta.description),
    ];
}

function validateAllSharedSkills(names: string[]): void {
    const errors: string[] = [];
    for (const n of names) errors.push(...validateSharedSkill(join(SHARED_SKILLS, n)));
    if (errors.length > 0) {
        for (const e of errors) console.error(`ERROR: ${e}`);
        process.exit(1);
    }
}

function materializeSymlink(name: string): string | null {
    const link = join(CLAUDE_SKILLS, name);
    const target = join("..", "..", ".agents", "skills", name);
    let exists = false;
    let isSymlink = false;
    try {
        const st = lstatSync(link);
        exists = true;
        isSymlink = st.isSymbolicLink();
    } catch {
        // not present
    }
    if (isSymlink) {
        const current = readlinkSync(link);
        if (current === target) return null;
        unlinkSync(link);
    } else if (exists) {
        die(
            `ERROR: name collision - .claude/skills/${name} is a real directory (Claude-only skill) ` +
                `but .agents/skills/${name} also exists (shared skill). Resolve by removing one of them.`,
        );
    }
    symlinkSync(target, link);
    return `symlinked ${rel(link)}`;
}

function syncSkillSymlinks(): string[] {
    const changes: string[] = [];
    const sharedExisted = existsSync(SHARED_SKILLS);
    if (!sharedExisted) mkdirSync(SHARED_SKILLS, { recursive: true });
    mkdirSync(CLAUDE_SKILLS, { recursive: true });

    const wanted = readdirSync(SHARED_SKILLS, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    const wantedSet = new Set(wanted);
    validateAllSharedSkills(wanted);

    for (const name of wanted) {
        const change = materializeSymlink(name);
        if (change) changes.push(change);
    }

    // If .agents/skills/ was missing entirely (sparse checkout, manual rm) and we
    // just created it empty, refuse to prune -- otherwise we'd silently delete every
    // Claude symlink. User-created symlinks elsewhere are unaffected either way.
    if (!sharedExisted && wanted.length === 0) return changes;

    for (const entry of readdirSync(CLAUDE_SKILLS, { withFileTypes: true })) {
        if (entry.isSymbolicLink() && !wantedSet.has(entry.name)) {
            const p = join(CLAUDE_SKILLS, entry.name);
            unlinkSync(p);
            changes.push(`pruned dangling ${rel(p)}`);
        }
    }
    return changes;
}

function syncAgents(): string[] {
    const changes: string[] = [];
    // Guard against a symlinked parent dir redirecting TOML writes out of the
    // repo before we create/populate `.codex/agents/`.
    assertDirInsideRepo(CODEX_AGENTS);
    mkdirSync(CODEX_AGENTS, { recursive: true });
    mkdirSync(CLAUDE_AGENTS, { recursive: true });

    const wanted = new Set<string>();
    const mdFiles = readdirSync(CLAUDE_AGENTS, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => e.name);
    for (const mdName of mdFiles) {
        const mdPath = join(CLAUDE_AGENTS, mdName);
        const { meta, body } = parseMd(mdPath);
        const tomlName = `${mdName.slice(0, -3)}.toml`;
        const tomlPath = join(CODEX_AGENTS, tomlName);
        assertRegularFileOrAbsent(tomlPath);
        const fresh = renderToml(meta, body, rel(mdPath));
        const current = existsSync(tomlPath) ? readFileSync(tomlPath, "utf-8") : null;
        if (current !== fresh) {
            writeFileSync(tomlPath, fresh, "utf-8");
            changes.push(`wrote ${rel(tomlPath)}`);
        }
        wanted.add(tomlName);
    }

    for (const entry of readdirSync(CODEX_AGENTS, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith(".toml") && !wanted.has(entry.name)) {
            const p = join(CODEX_AGENTS, entry.name);
            unlinkSync(p);
            changes.push(`pruned orphan ${rel(p)}`);
        }
    }
    return changes;
}

function main(): number {
    const check = process.argv.includes("--check");
    const changes = [...syncSkillSymlinks(), ...syncAgents()];
    for (const c of changes) console.log(c);
    if (check && changes.length > 0) {
        console.error(
            "sync-agent-config introduced changes; stage them and commit again.",
        );
        return 1;
    }
    return 0;
}

process.exit(main());
