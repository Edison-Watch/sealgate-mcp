# Contributing

## Getting Started

1.  **Prerequisites**:
    *   Bun >= 1.0
    *   Node.js >= 18 (for some tooling)

2.  **Setup**:
    ```bash
    make setup
    ```

3.  **Run Tests**:
    ```bash
    make test
    ```

## Development Workflow

1.  Create a new branch for your feature/fix.
2.  Make your changes.
3.  Ensure code quality commands pass:
    ```bash
    make ci
    ```
    This runs linting, dead code detection, type checking, tech debt checks, duplicate code detection, import boundary checks, and link linting.

## Code Style

*   Follow the existing conventions (camelCase for functions/variables, PascalCase for classes/types, kebab-case for file names).
*   Use Biome for linting and formatting (handled by `make fmt` and `make lint`).
*   4-space indentation, double quotes.
*   Add tests for new features.

## Pull Requests

*   Keep PRs focused on a single change.
*   Update documentation if necessary.
