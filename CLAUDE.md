# CLAUDE.md

Guidance for Claude Code and other agents working in this repository. `AGENTS.md`
is a symlink to this file.

## Project Overview

The public MCP server for [Sealgate](https://sealgate.ai), an AI
data-leak-prevention platform (a security gateway and data firewall for AI
agents). The server is a **thin MCP proxy**: it forwards tool calls to an
organisation's own Sealgate gateway. There is no fixed public gateway, so the
gateway URL and API key are supplied by the user through `SEALGATE_GATEWAY_URL`
and `SEALGATE_API_KEY`. Never hardcode or fabricate a gateway URL or key. Tools
must fail gracefully (return an error result) when the env is unset, never throw
at startup, so registry probes and `--help` do not crash.

## Common Commands

```bash
bun install                 # Install dependencies
bun run src/index.ts        # Run the server over stdio (add --help for usage)
bun run dev                 # Run in watch mode
bun run build               # Bundle to dist/
bun test                    # Run tests
make ci                     # All checks: lint, deadcode, typecheck, tech-debt,
                            #   duplicate-code, import boundaries, links,
                            #   AI-writing, Claude/Codex sync
make fmt                    # Auto-fix formatting with Biome
```

## Architecture

- `src/index.ts` - entrypoint. Handles `--help`/`--version`, picks the transport
  (stdio by default; streamable HTTP when `SEALGATE_MCP_TRANSPORT=http`).
- `src/server.ts` - builds the `McpServer` and registers the tools.
- `src/config.ts` - validates the two env vars with zod; returns a result rather
  than throwing.
- `src/gateway.ts` - fetch wrapper that calls the configured Sealgate gateway
  with Bearer auth.
- `src/tools/` - one file per proxy tool (`list_mcp_servers`,
  `get_session_status`, `check_policy`); `helpers.ts` holds the shared
  config-check and result-marshalling logic.
- `test/` - bun test suite; drives the server through an in-memory MCP client.

Registry and discovery manifests live at the repo root and are the reason this
repo is public: `server.json` (official MCP registry), `smithery.yaml`
(Smithery), `mcp.json` (Agent Plugins), `.well-known/mcp/server-card.json`, and
the `skills/` skill.

## Code Style

- 4-space indentation, double quotes, enforced by Biome (`biome.json`).
- camelCase for functions/variables, PascalCase for types, kebab-case for file
  names.
- No em dashes anywhere; the AI-writing check (`make check_ai_writing`) fails on
  them.

## Configuration Pattern

Runtime configuration is exactly two environment variables read and validated in
`src/config.ts` with zod:

```bash
# .env (git-ignored; see .env.example)
SEALGATE_GATEWAY_URL=https://your-org.gateway.sealgate.ai
SEALGATE_API_KEY=your-sealgate-api-key
```

`loadConfig()` returns a discriminated result (`{ ok: true, config }` or
`{ ok: false, message }`) so callers can surface a clear message instead of
crashing when the environment is not set.

## Git Workflow

- `main` is protected. Do not push directly to `main`; use a feature branch.
- Never force-push. If git gets into a bad state, stop and ask.
- Run `make ci` before committing and fix issues rather than weakening checks.

## Skills and Codex sync

This repo is dual-tool (Claude Code + Codex CLI). Shared skills live under
`.agents/skills/<name>/SKILL.md` and are symlinked into `.claude/skills/`;
subagents are authored in `.claude/agents/<name>.md` and `.codex/agents/*.toml`
is generated. After any change under those directories, run
`make sync-agent-config` (the prek `--check` hook blocks drifted commits). The
top-level `skills/` directory is the separate skills.sh distribution skill and is
not part of that sync.
