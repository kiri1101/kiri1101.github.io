# Jordan Tukum Folem — portfolio

Bilingual (FR/EN) portfolio built with Nuxt 4, prerendered to static HTML.

- Production: https://jordan-tukum.pages.dev (Cloudflare Pages, deploys `main`)
- Mirror: https://kiri1101.github.io (GitHub Pages via CI; unreachable on some Cameroonian networks)

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm test` | Unit tests: content integrity and i18n parity |
| `npm run generate` | Static build into `.output/public` |
| `npm run test:build` | Checks the generated HTML (titles, hreflang, links, assets, CVs) |
| `npm run check` | Typecheck + tests + build + build tests — run before every push |

## Editing content

All text lives in `content/*.ts` as `{ fr, en }` pairs; UI labels live in `i18n/locales/*.json`.
`npm test` fails on a missing translation, a leftover placeholder, a broken slug order, or a
headline figure (tests, sectors) that no longer matches the per-project data.

Case studies: `content/projects.ts`. Order = display order = prev/next cycle; also update
`public/sitemap.xml` when adding or renaming one.

## Design

« Cahier technique »: tokens in `app/assets/css/main.css`. Icons: Feather (MIT).
Spec: `docs/superpowers/specs/2026-10-03-portfolio-redesign-design.md`.
