# Gunited Travel Hub — Guidelines

## Components

The design system exports these components — import them from `@ws-94902ecbe26305dc86ea/5c4bd00d-5303-4eb4-96c6-a18ead850b08` and compose them before building anything from scratch:

`GunitedTicketCard`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-94902ecbe26305dc86ea/5c4bd00d-5303-4eb4-96c6-a18ead850b08/lib/theme` (source — preferred import)
- `@ws-94902ecbe26305dc86ea/5c4bd00d-5303-4eb4-96c6-a18ead850b08/styles.css` (source — preferred import)
- `@ws-94902ecbe26305dc86ea/5c4bd00d-5303-4eb4-96c6-a18ead850b08/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

