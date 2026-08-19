---
name: frontend-design-principles
description: Core visual principles for frontend work - subtract text, prefer SVG over prose, detail behind summary, one CTA. Use when building or editing UI, React components, pages, dashboards, docs or marketing sections, modals, or reviewing a frontend diff.
---

# Frontend design principles

Apply to every UI change.

**1. Subtract.** "Perfection is when there is nothing left to subtract." Before
adding anything, delete something: helper text, headings, borders, badges,
duplicated labels.

**2. A picture beats a thousand words.** If an icon or diagram can say it, don't
write the paragraph. Reuse below first, then https://svgl.app or
https://eito.me/icons. Inline it.

**3. Detail → summary.** Show the summary only; reveal detail on hover, click,
or expand. Never dump the full record upfront. Hover alone never counts: the
same detail must open by keyboard and by touch, so lean on native
`details`/`summary` or a real button before inventing a hover affordance.

**4. Keep the main thing the main thing.** Exactly one CTA per view, with the
only high-contrast treatment on screen. Everything else stays dull, so contrast
itself points the eye. Same CTA color, shape, and placement app-wide.

## Reuse before creating

Two frontends live here with separate dependency trees, so "reuse" means reuse
*within* a surface.

**App (Vite + React + Tailwind v4), `frontend/`**

- `src/App.tsx` is the only view today. Tailwind arrives through
  `@import "tailwindcss"` in `src/index.css`; put design tokens (`@theme`) and
  keyframes there, not in a component.
- Placeholder marks: `src/assets/react.svg`, `public/vite.svg`. Replace these
  when branding the app rather than adding a third placeholder alongside them.
- Inline new icons as JSX with `stroke="currentColor"` so they inherit text
  color. Hide a purely decorative mark with `aria-hidden="true"`, but only when
  the meaning already exists elsewhere: an icon-only control still needs an
  accessible name on the control itself (`aria-label` on the button), and an
  icon carrying meaning on its own needs `role="img"` plus a `<title>`. Do not
  add an icon package for a handful of marks.

**Docs (Next.js + Fumadocs), `docs/`**

- Shared page chrome: `components/ai/page-actions.tsx`,
  `lib/layout.shared.tsx`.
- There is no icon registry yet. To add sidebar icons, create
  `components/icons.tsx` with inline SVG components and resolve them from an
  `icon()` handler in `lib/source.ts`, keyed off each page's `icon:`
  frontmatter. Ship the mark in the bundle; never hot-link an external asset.

**Generated brand assets**

- `scripts/generate-logo.ts` and `scripts/generate-banner.ts` produce the
  project logo and README banner, and `make onboard` drives them. Regenerate
  through those scripts instead of hand-editing their output.
