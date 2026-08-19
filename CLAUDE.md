# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Super-opinionated Bun/TypeScript stack for fast development. Uses `bun` as runtime and package manager.
**Before any other work in this repo, enable prek:** `bun add -g prek && prek install`. Hooks are defined in `prek.toml`.

## Common Commands

```bash
# Onboarding & Setup
make onboard        # Interactive onboarding CLI (rename, deps, env, hooks, media)
make setup          # Install dependencies (bun install)
make all            # Install deps and run main application
make dev            # Run in watch mode

# Testing
make test           # Run all tests (bun test)
make test_fast      # Run fast tests (5s timeout)
make test_watch     # Run tests in watch mode

# Code Quality (run after major changes)
make fmt            # Format code with Biome (auto-fix)
make lint           # Run Biome linter (check only)
make deadcode       # Find dead code + unused deps with knip
make typecheck      # Run TypeScript type checker (tsc --noEmit)
make lint_links     # Check for broken links in markdown files
make ci             # Run all CI checks (lint, deadcode, typecheck, lint_links)

# Dependencies
bun install         # Install dependencies
bun add <pkg>       # Add new dependency
bun add -d <pkg>    # Add dev dependency
bun run src/index.ts # Run TypeScript files
```

## Architecture

- **src/** - Source code (entrypoint: `src/index.ts`)
- **tests/** - Test files (bun test)
- **docs/** - Documentation site (Next.js/Fumadocs, separate dependency tree)
- **frontend/** - Frontend app (Vite/React, separate dependency tree)

## Code Style

- camelCase for functions/variables
- PascalCase for classes/types/interfaces
- UPPER_CASE for constants
- kebab-case for file names
- 4-space indentation, double quotes (enforced by Biome)

## Configuration Pattern

Use environment variables via `process.env` for secrets and config. For structured config, import JSON or use a typed config object:

```typescript
// .env (git-ignored)
DATABASE_URL=...
API_KEY=...

// Access in code
const apiKey = process.env.API_KEY;
```

## Testing Pattern

```typescript
import { describe, test, expect } from "bun:test";

describe("MyFeature", () => {
    test("should do something", () => {
        expect(true).toBe(true);
    });
});
```

## Commit Message Convention

Use emoji prefixes indicating change type and magnitude (multiple emojis = 5+ files):
- 🏗️ initial implementation
- 🔨 feature changes
- 🐛 bugfix
- ✨ formatting/linting only
- ✅ feature complete with E2E tests
- ⚙️ config changes
- 💽 DB schema/migrations

## Post-Change Checks

After major changes, always run `make ci` and fix any issues before committing. If `make ci` is too slow for iterative work, run at minimum:
- `make fmt` (auto-fix formatting)
- `make lint` (check for errors)
- `make typecheck` (verify types)

## Subagents

- Folder-size CI failure → spawn subagent `.claude/agents/folder-refactor-advisor.md`.

## Skills & Codex sync

This repo is dual-tool (Claude Code + Codex CLI). Shared skills live in
`.agents/skills/<name>/SKILL.md` and are symlinked into `.claude/skills/`;
Claude-only skills (e.g. `thermo-nuclear-code-quality-review`) stay real dirs
under `.claude/skills/`. Subagents are authored in `.claude/agents/<name>.md`
and `.codex/agents/<name>.toml` is generated. After any change under
`.claude/skills`, `.claude/agents`, `.agents/skills`, or `.codex/agents`, run
`make sync-agent-config` (prek `--check` blocks drifted commits). See the
`manage-agent-config` skill and `.claude/rules/codex-claude-sync.md`.

## Git Workflow
- **Protected Branch**: `main` is protected. Do not push directly to `main`. Use PRs.
- **Merge Strategy**: Squash and merge.
- **Pre-commit CI gate**: Always run make ci before committing any changes. Ensure it passes with zero errors. Do not commit if make ci fails - fix all issues first, then commit.
- **Never force push**: Do not use `git push --force` or `--force-with-lease`. If you hit a git issue, stop and ask the user for guidance.

---

## Automated Translation (Jules Sync)

Docs under `docs/content/` are auto-translated by the **Jules Translation Sync**
workflow. Do NOT manually translate doc files - edit the English source and the
workflow will update all locales (`es`, `ja`, `zh`).
See [`docs/translation-guide.md`](docs/translation-guide.md) for the full
glossary, file naming conventions, and translation rules.
