# ANSI color codes
GREEN=\033[0;32m
YELLOW=\033[0;33m
RED=\033[0;31m
BLUE=\033[0;34m
RESET=\033[0m

PROJECT_ROOT=.

.DEFAULT_GOAL := help

########################################################
# Help
########################################################

### Help
.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)Available Make Targets$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "; category=""} \
		/^### / {category = substr($$0, 5); next} \
		/^[a-zA-Z_-]+:.*?## / { \
			if (category != last_category) { \
				if (last_category != "") print ""; \
				print "$(GREEN)" category ":$(RESET)"; \
				last_category = category; \
			} \
			printf "  $(YELLOW)%-23s$(RESET) %s\n", $$1, $$2 \
		}' $(MAKEFILE_LIST)

########################################################
# Check dependencies
########################################################

check_bun:
	@if ! command -v bun > /dev/null 2>&1; then \
		echo "$(RED)bun is not installed. Please install bun before proceeding.$(RESET)"; \
		exit 1; \
	else \
		bun --version; \
	fi

########################################################
# Setup
########################################################

### Setup & Dependencies
setup: check_bun ## Install dependencies
	@echo "$(YELLOW)🔄 Installing dependencies...$(RESET)"
	@bun install
	@echo "$(GREEN)✅ Dependencies installed.$(RESET)"

setup_githooks: ## Set up git hooks with prek
	@echo "$(YELLOW)🔨 Setting up githooks with prek...$(RESET)"
	@git config --unset-all core.hooksPath || true
	@bun install -g @j178/prek
	@prek install

.PHONY: sync-agent-config
sync-agent-config: check_bun ## Sync Claude <-> Codex skills & subagents (regenerates symlinks and .codex/agents/*.toml)
	@bun run scripts/sync_agent_config.ts

.PHONY: sync-agent-config-check
sync-agent-config-check: check_bun ## Fail if Claude <-> Codex sync is out of date (drift gate for CI)
	@bun run scripts/sync_agent_config.ts --check

########################################################
# Run
########################################################

### Running
all: check_bun ## Install deps and run the MCP server over stdio
	@bun install
	@echo "$(GREEN)🏁 Running Sealgate MCP server...$(RESET)"
	@bun run start

dev: check_bun ## Run the server in watch mode
	@bun run dev

build: check_bun ## Bundle the server to dist/
	@echo "$(YELLOW)📦 Building...$(RESET)"
	@bun run build
	@echo "$(GREEN)✅ Build completed.$(RESET)"

########################################################
# Testing
########################################################

### Testing
test: check_bun ## Run all tests
	@echo "$(GREEN)🧪 Running tests...$(RESET)"
	@bun test
	@echo "$(GREEN)✅ Tests passed.$(RESET)"

test_fast: check_bun ## Run fast tests (5s timeout)
	@echo "$(GREEN)🧪 Running fast tests...$(RESET)"
	@bun test --timeout 5000
	@echo "$(GREEN)✅ Fast tests passed.$(RESET)"

test_watch: check_bun ## Run tests in watch mode
	@bun test --watch

########################################################
# Code Quality
########################################################

### Code Quality
fmt: check_bun ## Format code with Biome
	@echo "$(YELLOW)✨ Formatting with Biome...$(RESET)"
	@bunx biome check --write
	@echo "$(GREEN)✅ Formatting completed.$(RESET)"

lint: check_bun ## Run Biome linter
	@echo "$(YELLOW)🔍 Running Biome linter...$(RESET)"
	@bunx biome check
	@echo "$(GREEN)✅ Linting completed.$(RESET)"

tech_debt: check_bun ## Check TODO/FIXME markers in TypeScript/JavaScript
	@echo "$(YELLOW)🔍Checking tech debt markers...$(RESET)"
	@! git grep -nEI "(TODO|FIXME|HACK|XXX)" -- '*.ts' '*.tsx' '*.js' '*.jsx' || (echo "$(RED)Tech debt markers found. Please resolve or remove them.$(RESET)" && exit 1)
	@echo "$(GREEN)✅Tech debt check completed.$(RESET)"

duplicate_code: check_bun ## Detect duplicate code blocks
	@echo "$(YELLOW)🔍Checking duplicate code...$(RESET)"
	@bunx jscpd src/ --min-lines 5 --min-tokens 50 --threshold 5
	@echo "$(GREEN)✅Duplicate code check completed.$(RESET)"

deadcode: check_bun ## Find dead code and unused deps with knip
	@echo "$(YELLOW)🔍 Running knip (dead code + unused deps)...$(RESET)"
	@bunx knip
	@echo "$(GREEN)✅ Dead code check completed.$(RESET)"

import_lint: check_bun ## Enforce module boundaries with dependency-cruiser
	@echo "$(YELLOW)🔍 Running dependency-cruiser...$(RESET)"
	@bunx depcruise src test --config .dependency-cruiser.cjs --output-type err
	@echo "$(GREEN)✅ Module boundary check completed.$(RESET)"

typecheck: check_bun ## Run TypeScript type checker
	@echo "$(YELLOW)🔍 Running TypeScript type checker...$(RESET)"
	@bunx tsc --noEmit
	@echo "$(GREEN)✅ Type check completed.$(RESET)"

lint_links: check_bun ## Check markdown links
	@echo "$(YELLOW)🔍 Linting markdown links...$(RESET)"
	@find . -name "*.md" -not -path "*/node_modules/*" | xargs bunx markdown-link-check --quiet --config .markdown-link-check.json
	@echo "$(GREEN)✅ Link linting completed.$(RESET)"

agents_validate: check_bun ## Validate AGENTS.md content
	@echo "$(YELLOW)🔍Validating AGENTS.md...$(RESET)"
	@bun run scripts/validate-agents-md.ts
	@echo "$(GREEN)✅AGENTS.md validation completed.$(RESET)"

check_ai_writing: check_bun ## Check for AI-written content
	@echo "$(YELLOW)🔍 Checking AI writing patterns...$(RESET)"
	@bun run scripts/check_ai_writing.ts
	@echo "$(GREEN)✅ AI writing check completed.$(RESET)"

ci: lint deadcode typecheck tech_debt duplicate_code import_lint lint_links check_ai_writing sync-agent-config-check ## Run all CI checks
	@echo "$(GREEN)✅ CI checks completed.$(RESET)"
