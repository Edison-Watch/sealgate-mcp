---
name: onboarding
description: Interview the user, inspect this Bun/TypeScript template, run the interactive onboarding CLI, and prune unused systems so a new project gets running quickly.
---

# Onboarding

Use this skill when the user wants to turn this template into a real project,
especially when they invoke `/onboarding`, ask to run onboarding, or want to
rename the project and remove unused template scaffolding.

`onboard.ts` at the repo root is the source of truth for every onboarding
step. Read it before changing anything. Its `orchestrator()` defines the step
order, and each `cmd*` function (`cmdRename`, `cmdDeps`, `cmdEnv`, `cmdHooks`,
`cmdMedia`) defines exactly what that step does. The CLI dispatch at the bottom
of the file maps subcommands to those functions.

## Workflow

1. Inspect the repo before changing anything:
   - `CLAUDE.md` / `AGENTS.md` (AGENTS.md is a symlink to CLAUDE.md), `README.md`,
     `package.json`, `Makefile`, `.env.example`
   - `onboard.ts` - the orchestrator step list and each `cmd*` function, so you
     know precisely what renaming, dependency install, env config, hook setup,
     and media generation will touch
   - `src/` (entrypoint `src/index.ts`), `tests/`, and the two independent
     dependency trees under `docs/` (Next.js/Fumadocs) and `frontend/`
     (Vite/React) - each has its own `package.json`
   - Systems onboarding does NOT manage (handle these manually - see step 6):
     `docs/` and `frontend/` content/branding, and CI workflows under
     `.github/workflows/`

2. Interview the user briefly before running anything. Confirm:
   - New project name (kebab-case - `onboard.ts` validates this and derives a
     display name from it)
   - Which onboarding steps to run: rename, dependency install, environment
     configuration, git-hook setup, media (banner/logo) generation
   - Whether the optional `docs/` site and `frontend/` app are kept or removed
   - Which `.env.example` keys they actually need (secrets vs. optional)

3. Use the onboarding CLI as the source of truth - do not hand-edit
   `package.json`/`README.md` for the rename when the CLI does it:
   - Full interactive run: `make onboard` (or `bun run onboard.ts`). It walks
     every step, asking to run or skip each, and prints a summary.
   - Single step headless: `bun run onboard.ts <subcommand>` where subcommand is
     one of `rename`, `deps`, `env`, `hooks`, `media`. Use these to re-run or
     target one concern without the full wizard.
   - `bun run onboard.ts --help` lists the subcommands.

4. What each step does (verify against `onboard.ts`, do not assume):
   - **rename** - rewrites `name`/`description` in `package.json` and updates
     `README.md` references to the new kebab-case name.
   - **deps** - runs `bun install`.
   - **env** - reads `.env.example`, groups keys, and writes selected values to
     `.env` (git-ignored). Keys matching secret patterns (`SECRET`, `_KEY`,
     `TOKEN`, `PASSWORD`, `CREDENTIAL`) are treated as secrets.
   - **hooks** - installs git hooks via `prek` (`prek install`).
   - **media** - generates banner and/or logo assets via the Gemini scripts
     (`make banner` / `make logo`); requires `GEMINI_API_KEY`. Safe to skip.

5. Verify the result after onboarding:
   - `bun install` succeeded and `bun run start` (or `make all`) runs the
     entrypoint.
   - `make ci` passes (lint, deadcode, typecheck, lint_links, and the other
     wired checks). If scope was small, run at minimum `make fmt`, `make lint`,
     and `make typecheck`.
   - `prek install` registered the hooks (if the hooks step ran).

6. Handle systems onboarding does not touch, after confirming with the user:
   - `docs/` and `frontend/` branding/content if those are kept - they almost
     always need rebranding and have their own dependency trees.
   - Removing `docs/` or `frontend/` if unused: delete the directory and prune
     any `Makefile`/`package.json` references to it, then re-run `make ci`.
   - CI workflows under `.github/workflows/` - update or remove to match the
     kept surfaces.

## Guardrails

- Read `onboard.ts` before running any step so you can describe precisely what
  it will change; never guess at its behavior.
- Do not delete `docs/`, `frontend/`, or CI configs without explicit user
  confirmation.
- Never write real secrets into a committed file. The env step targets `.env`,
  which is git-ignored - keep it that way.
- Do not push to `main`, force-push, or run destructive git commands as part of
  onboarding.
- The media step needs network access and `GEMINI_API_KEY`; if either is
  missing, skip it rather than failing the whole run.
