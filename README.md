# bun-template

<p align="center">
  <img src="media/banner.png" alt="Bun-Template" width="400">
</p>

<p align="center">
<b>🥟 Agent-ergonomic opinionated Bun template</b>
</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#credits">Credits</a> •
  <a href="#about-the-core-contributors">About the Core Contributors</a>
</p>

<p align="center">
  <img alt="Project Version" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FMiyamura80%2FBun-Template%2Fmain%2Fpackage.json&query=%24.version&label=version&color=blue">
  <img alt="Bun" src="https://img.shields.io/badge/runtime-bun-f9f1e1?logo=bun">
  <img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/Miyamura80/Bun-Template">
  <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/Miyamura80/Bun-Template/ci_checks.yaml?branch=main">
</p>

---

<p align="center">
  <img src="media/demo.gif" alt="Bun-Template Demo" width="600">
</p>

## Key Features

| Feature | Description |
|---------|-------------|
| **Bun runtime** | Fast TypeScript execution and package management |
| **Zod config** | YAML + env var config with Zod schema validation |
| **Biome** | Linting and formatting |
| **knip** | Dead code and unused dependency detection |
| **dependency-cruiser** | Module boundary enforcement |
| **jscpd** | Duplicate code detection |
| **prek** | Pre-commit hooks |
| **Fumadocs** | Documentation site (Next.js) |
| **Vite + React** | Frontend app |

## Quick Start

```bash
# Interactive onboarding
make onboard

# Install dependencies and run
make all

# Format code
make fmt

# Run tests
make test

# Run all CI checks (lint, deadcode, typecheck, etc.)
make ci
```

## Configuration

Config is loaded from YAML with environment variable overrides:

```typescript
import { globalConfig } from "@/config";

// Access config values from src/config/global-config.yaml
globalConfig.exampleParent.exampleChild;

// Access secrets from .env
globalConfig.openaiApiKey;

// Feature flags (overridable via FEATURES__FLAG_NAME=true)
globalConfig.features.newUi;
```

**Precedence** (highest to lowest):
1. Environment variables (with `__` for nesting, e.g. `DEFAULT_LLM__DEFAULT_MAX_TOKENS=50000`)
2. `.global-config.yaml` (local override, git-ignored)
3. `src/config/production-config.yaml` (if `DEV_ENV=prod`)
4. `src/config/global-config.yaml` (base config)

## Credits

- [Bun](https://bun.sh) - JavaScript runtime and package manager
- [Biome](https://biomejs.dev) - Linter and formatter
- [Zod](https://zod.dev) - TypeScript schema validation
- [prek](https://github.com/j178/prek) - Pre-commit hook framework
- [Fumadocs](https://fumadocs.dev) - Documentation framework

## About the Core Contributors

<a href="https://github.com/Miyamura80/Bun-Template/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Miyamura80/Bun-Template" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
