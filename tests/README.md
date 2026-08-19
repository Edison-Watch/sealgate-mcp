# Tests

## Writing tests

Tests are written using `bun:test`. To add a new test, create a `.test.ts` file in the `tests` directory.

```typescript
import { describe, test, expect } from "bun:test";

describe("MyFeature", () => {
    test("should do something", () => {
        expect(true).toBe(true);
    });
});
```

## Running tests

```bash
make test          # Run all tests
make test_fast     # Run with 5s timeout
make test_watch    # Run in watch mode
```
