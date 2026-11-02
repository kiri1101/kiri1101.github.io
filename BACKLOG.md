# Backlog

Jordan Tukum's portfolio, built on Orbit. Live at https://jordan-tukum.pages.dev, deployed from `main`. Last updated: 2026-11-02.

**Status:** live. What remains is optional content work and maintenance.

## Done

- **J1–J4:** Orbit rebuilt with Jordan's profile and nine projects, in French and English, using the same URLs as the old site.
  - Contact form on a Cloudflare Pages Function: Turnstile, delivery through Resend.
  - Project imagery, with illustrative mock-ups labelled.
  - Open Graph images and bilingual alt text.
- **Final review and fix round:**
  - The bid client's name is guarded by hash.
  - Deploy config lives in `wrangler.jsonc`.
  - e2e counts are derived from the content.
  - README and the fonts' OFL licence.
- **J5, deploy (2026-11-02):**
  - Turnstile widget and Pages secrets set for production and preview. The site key is committed in `app/lib/turnstile-key.ts`.
  - Pages build: `npm run build`, output `build/client`, Node from `.node-version`.
  - Preview checked by the owner on PC and iPhone:
    - PageSpeed mobile: Performance 100 on the home page and on a case study;
    - a real contact message was delivered;
    - content approved.
  - Production checked:
    - both languages and every old sitemap URL return 200;
    - each locale's 404 page answers with status 404;
    - security headers are sent, and there is no `noindex`;
    - sitemap and robots;
    - canonical and Open Graph tags on every page.
- **Contact fix:** Cloudflare's own Turnstile widget is always shown. The look-alike checkbox, which did nothing on iPhone, is gone.
- **CI fix (PR #1):**
  - The contact tests now assert the real flow.
  - The worker and no-WebGL tests skip, with a reason, where Linux WebKit lacks the capability.
  - The main-thread 3D context is released when the page settles on the still poster. This fixes a stale orb frame in WebKit.
  - CI on `main` is green: 1107 passed, 103 skipped.
- **Hero sub-line:** now "Full Stack Developer. Based in Douala, Cameroon." / « Développeur Full Stack. Basé à Douala, Cameroun. ». It names no employer, so it needn't change with a new job. The About section keeps the current role and employer.

## Optional, whenever the owner wants

- Answer the remaining items in `content/OPEN-QUESTIONS.md`.
- Review the French UI wording (`app/i18n/strings.ts`) and the Orbit project write-up again.
- Decide whether case studies should also prefetch the 3D chunk (about 135 KB), so the return to the orbit is faster on slow networks. Default: no.

## Maintenance

- GitHub's `ubuntu-latest` runner moves to Ubuntu 26 (actions/runner-images#14748). If a CI run starts failing for environment reasons, pin `ubuntu-24.04` in the workflow.
- When a project cover changes, run `npm run images -- <slug>`, `npm run card-textures` and `npm run og`, then commit the regenerated files. The tests check that they're fresh.
- Run local e2e on a fresh `E2E_PORT` after a fresh build. Locally, Playwright reuses any server already running on port 4173.
