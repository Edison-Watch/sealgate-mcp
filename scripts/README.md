# Scripts

Utility and initialization scripts for the Bun-Template project.

## Asset Generation

One-time scripts for generating brand assets using the Gemini AI image generation API.

### Prerequisites

Set `GEMINI_API_KEY` in your `.env` file:

```
GEMINI_API_KEY=AIza...
```

### generate-banner.ts

Generates a banner image using LLM-powered description generation and Gemini image generation.

**Usage:**

```bash
# Using Makefile
make banner

# Direct (with optional title and suggestion args)
bun run scripts/generate-banner.ts
bun run scripts/generate-banner.ts "My-Project" "use a rabbit in the image"
```

**Output:**

- `media/banner.png` - Wide horizontal banner (16:9 aspect ratio, sumi-e ink wash style)

### generate-logo.ts

Generates a full logo suite (wordmark, icons, favicon) using a multi-step AI pipeline with greenscreen compositing.

**Usage:**

```bash
# Using Makefile
make logo

# Direct (with optional project name and suggestion args)
bun run scripts/generate-logo.ts
bun run scripts/generate-logo.ts "My-Project" "modern geometric style"
```

**Output (saved to `docs/public/`):**

- `logo-light.png` - Horizontal wordmark for light mode
- `logo-dark.png` - Horizontal wordmark for dark mode
- `icon-light.png` - Icon only, 512x512, for light mode
- `icon-dark.png` - Icon only, 512x512, for dark mode
- `favicon.ico` - Favicon (32x32, ICO format)

**Pipeline:**

1. Generate creative wordmark description via Gemini text model
2. Generate light mode wordmark with greenscreen background
3. Extract icon from wordmark (AI removes text, keeps icon)
4. Remove greenscreen from both assets (pixel-level alpha manipulation)
5. Invert colors for dark mode variants
6. Resize icons and create favicon

### Dependencies

- `@google/genai` - Gemini API client
- `sharp` - Image processing (resize, pixel manipulation)
- `to-ico` - ICO file format conversion

## Other Scripts

- **check_ai_writing.ts** - Checks for em dashes in the codebase (AI writing detector)
- **validate-agents-md.ts** - Validates CLAUDE.md/AGENTS.md has required sections
