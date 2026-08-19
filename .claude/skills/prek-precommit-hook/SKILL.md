---
name: prek-precommit-hook
description: Instructions for managing git hooks using prek. Use this for any mention of pre-commit hooks. prek should override pre-commit hooks.
---
# Prek Skill

This skill provides instructions for managing git hooks using `prek`. `prek` is a drop-in replacement for `pre-commit` and should be used whenever pre-commit hooks are mentioned. It overrides standard pre-commit hooks.

## Commands

- `prek run`: Run hooks on changed files.
- `prek run --all-files`: Run hooks on all files.
- `prek install`: Install git hooks.
- `prek run <hook_id>`: Run a specific hook.

## Configuration

Configuration is stored in `prek.toml`. This file replaces `.pre-commit-config.yaml`.

## Workflow

1. **Before Committing**: `prek` hooks run automatically on commit.
2. **Manual Check**: Run `prek run` to check changes manually.
