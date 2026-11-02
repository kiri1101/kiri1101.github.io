# Jordan Tukum, portfolio

Jordan Tukum's portfolio on the Orbit template (French and English, with his real profile and nine projects), built with React 19 and React Router 8.5 framework mode (static prerender, `ssr: false`).

## Scripts

- `npm run dev` start the dev server
- `npm run typecheck` generate route types and run `tsc`
- `npm test` unit tests (Vitest)
- `npm run build` static build to `build/client`: both languages' home pages (`/` French, `/en` English), one flat page per project and language (`projets/<slug>.html` at `/projets/<slug>`, `en/projects/<slug>.html` at `/en/projects/<slug>`), the 404 pages (`404.html` French, `en/404.html` English), `sitemap.xml` and `robots.txt`; it fails if a project image is missing
- `npm run check:bundle` first-route JS budget (150 KB gzipped) with no three.js code in it, and the 3D scene only in lazy chunks (a dynamic import, or the scene worker, whose own script has no three.js either); every case-study page is checked against the same budget, with no three.js or scene code at all
- `npm run preview` serve `build/client` on http://localhost:4173 as the static host does: compressed, each page at its path, and the 404 page with a 404 status for unknown paths
- `npm run test:e2e` Playwright (chromium, firefox, webkit, mobile-chrome, mobile-safari), against the same server
- `npm run poster` after a build, regenerate `public/orb-poster.avif` from the real 3D scene at the top of the page
- `npm run images` capture the project imagery from the HTML/CSS compositions in `scripts/mockups/<slug>.html` into `public/projects/<slug>/` (AVIF and WebP, 1600 and 800 wide), including each cover's portrait crop for phones (`cover-phone`, reframed from the cover by `scripts/mockups/kit.js`); `npm run images -- <slug>` for one project
- `npm run og` after `npm run images`, write the 1200x630 JPEG Open Graph images: `public/og-fr.jpg` and `og-en.jpg` for the home page, `public/projects/<slug>/og.jpg` per project
- `npm run card-textures` after any cover changes, write each project's `card.avif`/`card.webp` (the cover at the 3D scene's texture size) and record the covers' hashes; `npm test` fails while a card texture is older than its cover

## Projects

Each project is one Markdown file per language, `content/projects/fr/<slug>.md` and `content/projects/en/<slug>.md` (same slug, order and image files in both; frontmatter: title, year, summary, facts, figures, architecture, key decision, accent colours, images) plus its images in `public/projects/<slug>/`. Counts, order, year ranges, the case-study pages and the next-project links all come from these files. Images are referenced by their 1600-wide AVIF (`cover.avif`, `section-1.avif`); the pages serve the 800-wide and WebP versions beside it, and on phones the cover's portrait crop (`cover-phone.avif`). A figure may carry a `short` label, which phones show under it in place of the full one.

## Deploying (Cloudflare Pages)

Project `jordan-tukum`, Git-integrated; `main` deploys to https://jordan-tukum.pages.dev.

**Dashboard settings** (Workers & Pages > jordan-tukum > Settings):

- Framework preset: none. Build command: `npm run build`. Build output directory: `build/client`. Root directory: empty.
- Node 24: `.node-version` pins it (the CI uses Node 24; Vite 8 needs Node 20.19+).
- `wrangler.jsonc` is the source of truth for the project's configuration, so the plain variable `CONTACT_TO` (`jtukum@outlook.com`, which must be the Resend account's own address) lives there under `vars`, not in the dashboard.
- Secrets (encrypted, Production and Preview), set in the dashboard or with `npx wrangler pages secret put <NAME> --project-name jordan-tukum`: `RESEND_API_KEY` (Resend API key) and `TURNSTILE_SECRET` (secret of the Turnstile widget for `jordan-tukum.pages.dev`). They never go in the repo.
- Turnstile site key: public by design, so it is committed as `TURNSTILE_SITE_KEY` in `app/lib/turnstile-key.ts`. Any build on Pages (`CF_PAGES=1`), or with `REQUIRE_TURNSTILE_KEY=1`, bakes it in; a `VITE_TURNSTILE_SITE_KEY` variable overrides it. Such a build fails with a clear message if the key is missing or is Cloudflare's always-pass test key. Dev, tests and local builds use the test key. No dashboard variable is needed.
- Canonical and Open Graph URLs use `origin` in `app/site.config.ts`.

**Contact form.** `functions/api/contact.ts` is a Pages Function: it runs `handleContact` (`worker/contact.ts`: same-origin check, validation, Turnstile) and sends through the Resend HTTP API (`worker/resend.ts`). The sender is `Jordan Tukum — Portfolio <onboarding@resend.dev>` with Reply-To set to the visitor; without a verified domain Resend delivers only to its own account's address. Other methods get 405; a Resend failure gets 502.

**Local.** `cp .dev.vars.example .dev.vars`, then `npm run build` and `npx wrangler pages dev build/client` (Functions, `_headers` and Pages routing). `wrangler.jsonc` is the Pages config (`pages_build_output_dir`).

**Routing.** The build emits flat pages (`projets/<slug>.html`, `en/projects/<slug>.html`, `en.html`; see `flattenPageFolders` in `react-router.config.ts`): Pages serves `/projets/<slug>` with a 200 and redirects `/projets/<slug>/` and `.html` to it, whereas `<slug>/index.html` would redirect the slashless URL (the canonical form) to `/projets/<slug>/`. Unknown paths get the nearest `404.html` with a 404 status: `en/404.html` under `/en`, the root `404.html` elsewhere.

**Languages.** French is the default (`/`, `/projets/<slug>`), English lives under `/en` (`/en`, `/en/projects/<slug>`). The language is read from the path (`app/i18n/locale.ts`); every UI string is in `app/i18n/strings.ts` as `{ fr, en }`, every `site.config.ts` string is a `{ fr, en }` pair, and the contact Worker answers validation failures with error codes that the form translates. `public/_headers` carries the security headers (`/*`) and the immutable cache of `/assets/*`.

## Licence

All rights reserved. The two fonts (Inter Tight and Instrument Serif) are under the SIL Open Font Licence 1.1, which "All rights reserved" does not cover; see `app/fonts/OFL.txt`.
