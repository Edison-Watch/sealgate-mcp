# Scripts

Repository automation for the Sealgate MCP server.

- **check_ai_writing.ts** - fails if an em dash appears anywhere in the tree
  (the AI-writing check). Run via `make check_ai_writing`.
- **validate-agents-md.ts** - validates that `CLAUDE.md` / `AGENTS.md` has the
  required sections. Run via `make agents_validate`.
- **sync_agent_config.ts** - syncs Claude and Codex skills and subagents:
  symlinks `.claude/skills/*` and regenerates `.codex/agents/*.toml`. Run via
  `make sync-agent-config` (`--check` gates commits in the prek hook).
- **check_large_files.sh** - fails if a source file exceeds the line-count
  threshold. Shared by `.github/workflows/large-files.yaml` and prek.
- **check_folder_sizes.sh** - fails if a folder exceeds the file-count
  threshold. Shared by `.github/workflows/folder-size.yaml` and prek.
