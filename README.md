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
| `npm run preview` | Serves `.output/public` with clean URLs (`/en` → `en.html`), like Cloudflare |

## Hosting notes

- The Nitro preset is pinned to `static`: Cloudflare's auto-detected preset would write to `dist/`
  while the dashboard deploys `.output/public` (build command `npx nuxi generate`, `NODE_VERSION=24`).
- Pages are emitted as flat files (`en.html`, `projets/<slug>.html`) so `/en` and `/projets/<slug>`
  answer 200 with no trailing-slash redirect — they are the canonical/hreflang/sitemap URLs.
  `python -m http.server` does not map `/en` to `en.html`; use `npm run preview` instead.
- The GitHub Pages mirror deploys from CI: the repo's Pages source must be "GitHub Actions"
  (switch it before the first merge of a build without a root `index.html` in git).

## Editing content

All text lives in `content/*.ts` as `{ fr, en }` pairs; UI labels live in `i18n/locales/*.json`.
`npm test` fails on a missing translation, a leftover placeholder, a broken slug order, or a
headline figure (tests, sectors) that no longer matches the per-project data.

Case studies: `content/projects.ts`. Order = display order = prev/next cycle; also update
`public/sitemap.xml` when adding or renaming one.

## Design

« Cahier technique »: tokens in `app/assets/css/main.css`. Icons: Feather (MIT).
Spec: `docs/superpowers/specs/2026-10-03-portfolio-redesign-design.md`.
