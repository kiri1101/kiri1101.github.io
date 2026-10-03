# Portfolio redesign — design spec

Date: 2026-10-03 · Branch: `redesign` · Status: awaiting owner review

## 1. Goal

Replace the single-page English portfolio with a bilingual (FR/EN) static site that a recruiter can
open from a CV link — including on Cameroonian networks — and decide within a minute whether to call.

**Success criteria**

1. Loads on Cameroonian networks: primary host is Cloudflare Pages (`jordan-tukum.pages.dev`);
   GitHub Pages (`kiri1101.github.io`) remains a mirror only.
2. Every claim matches the CV and the verified inventory — no invented figures, no placeholders.
3. Evidence is visible without clicking: proof strip, project cards, case studies, public code links.
4. Each page arrives as prerendered HTML with its own title, description, social preview and
   `hreflang` alternates, so WhatsApp/LinkedIn previews and search engines see real content.
5. Downloadable general CVs in French and English.
6. Lighthouse (mobile) ≥ 90 performance, ≥ 95 accessibility, SEO and best practices.

## 2. Locked decisions

| Topic | Decision |
|---|---|
| Stack | Nuxt 4 (`nuxi generate`, fully static), Vue 3, TypeScript 6.x (not 7 — `vue-tsc` compatibility, as in the owner's other Nuxt projects) |
| Hosting | Cloudflare Pages auto-deploys `main`; GitHub Actions deploys the same build to GitHub Pages |
| Languages | `@nuxtjs/i18n`, strategy `prefix_except_default`, default `fr` at `/`, English at `/en`; no browser-language redirect |
| Visual direction | B « Cahier technique » as validated in the mockup (canvas artifact `NVc7k2AZgsXP6MQTg6kHaX`, page « Maquette ») |
| Typography | Montserrat (400/500/600/700/800) + JetBrains Mono (400/500/700), self-hosted via `@nuxt/fonts`, latin + latin-ext subsets |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) with design tokens in `@theme`; no component library |
| Client naming | Name only institutions already on the CV, plus the **Ministère des Finances — Direction Générale du Budget** for SERVICES PUBLICS (public on the site, approved by owner). Others generic |
| Photo | None — typographic hero |
| Undisclosed facts | Team sizes per project and usage figures are not published (owner decision) |

## 3. Routes

| Page | FR | EN |
|---|---|---|
| Home | `/` | `/en` |
| Case study (×8) | `/projets/<slug>` | `/en/projects/<slug>` |
| CV | `/cv/CV_Jordan_TUKUM_FOLEM_FR.pdf` | `/cv/CV_Jordan_TUKUM_FOLEM_EN.pdf` |
| Not found | `404.html` (bilingual) | |

Slugs (identical in both languages, in this order — also the prev/next cycle):
`services-publics`, `bornes-libre-service`, `ministere-fonction-publique`, `conformite-bancaire`,
`equip4safety`, `tv-satellite`, `schulyf`, `drymhome`.

Base URL for canonical and `hreflang` links: `https://jordan-tukum.pages.dev`.

## 4. Content model

All copy lives in typed data, never in components, so both languages cannot drift apart.

- `content/types.ts` — `Localized<T> = { fr: T; en: T }` and the entity types below.
- `content/profile.ts` — name, title, value proposition, contacts (email, phone, WhatsApp
  `https://wa.me/237698377389`, LinkedIn, GitHub), profile-card rows, proof-strip stats,
  "delivered for" institutions.
- `content/projects.ts` — the 8 case studies: `slug`, `number`, `sector`, `title`, `summary`,
  `role`, `period`, `organisation` (client or generic description), `stack[]`, `badges[]`,
  `links` (live / demo / code or `private`), `image` (screenshot, schematic or none), and the
  case-study body: `context`, `contribution[]`, `architecture[]` (label + description layers),
  `keyDecision`, `quality[]` (value + label), `result`.
- `content/other-projects.ts` — Port of Douala TEL, HAURIZON, yt-mp3, QR generator.
- `content/method.ts`, `content/experience.ts`, `content/skills.ts` (three tiers),
  `content/education.ts`.
- `i18n/locales/fr.json`, `en.json` — UI strings only (navigation, buttons, section titles, ARIA labels).

Claims are carried over verbatim from the validated mockup and `CLAUDE.md` inventory. The proof
strip's "2,000+ tests" is the sum SchuLyf 584 + DrymHome 977 + PSPA 282 + EWA 181 = 2,024; a test
keeps the stat consistent with the per-project figures.

## 5. Components

```
app/
  app.vue                     layout + skip link
  layouts/default.vue         TopBar, <slot/>, SiteFooter, MobileActionBar
  pages/index.vue             home
  pages/projets/[slug].vue    case study (i18n paths: fr /projets/[slug], en /projects/[slug])
  error.vue                   bilingual 404
  components/
    layout/   TopBar · LanguageSwitch · OpenBadge · SiteFooter · MobileActionBar
    home/     HeroSection · ProfileCard · ProofStrip · TrustRow · ProjectGrid · FeaturedProjectCard
              · ProjectCard · MethodSection · CareerTimeline · SkillTiers · OtherProjects
              · EducationList · ContactBand
    case/     CaseHeader · FactPanel · BrowserFrame · CaseToc · ArchitectureLayers · KeyDecision
              · QualityStats · PrevNextNav · CtaBand
    ui/       SectionHeading · Badge · StackPill · IconButton · Icon (inline stroke SVG set)
              · KioskSchematic · BlueprintGrid
  composables/useProject.ts   lookup by slug, prev/next, localized accessors
```

Each component receives already-localized props; only pages read from `content/` and the i18n locale.

## 6. Visual system (from the mockup)

Tokens (`@theme`): `bg #F6F7F9`, `surface #FFFFFF`, `ink #13203A`, `text #3A4A66`,
`muted #5A6A85`, `line #D5DCE6`, `grid #E6EBF2`, `accent #2E5BA8`, `accent-hover #234A8C`,
`accent-soft #EAF0FA`, `tint #EEF2F8`, `signal #E3A32B` (dots only, never text),
`on-navy #8FB3F0`, `on-navy-muted #A9B6CC`, `footer #0E182C`.

Signature details: 32 px blueprint grid behind hero and contact, `FIG. 0x` mono captions, numbered
section headings with a rule, stroke icons, browser frame around screenshots, kiosk schematic for the
private kiosk project. Radii 8 / 12 / 14 / 16 px. Container max width 1240 px, 32 px gutters
(20 px on mobile).

## 7. Accessibility

Semantic landmarks, one `h1` per page, skip link, visible `:focus-visible` rings (accent, 2 px),
`lang` set per locale, `aria-current` on the active language and on the active TOC entry,
`aria-label` on icon-only controls, ≥ 44 px touch targets, `prefers-reduced-motion` respected.
All token pairs used for text meet WCAG AA (4.5:1; 3:1 at ≥ 24 px).

## 8. SEO and previews

Per page: `useSeoMeta` (title, description, `og:*`, `twitter:card`), canonical, `hreflang` fr/en +
`x-default` via `useLocaleHead`. Social image: one 1200×630 PNG per locale (`og-fr.png`, `og-en.png`)
rendered once from an HTML template in the design style and committed to `public/`. JSON-LD `Person`
(updated: job title, `knowsAbout` without Rust, `sameAs`, `alumniOf` incl. IUC) on the home pages.
Keep the existing Google site-verification meta tag. `robots.txt` and `sitemap.xml` (static, listing
the 18 pages).

## 9. Assets

- Screenshots: `public/img/services-publics.webp`, `public/img/equip4safety.webp` (from the mockup
  captures, converted to WebP, explicit width/height, lazy-loaded except above the fold).
- Kiosk illustration: `KioskSchematic` component (HTML/CSS, no image).
- `public/favicon.svg` (JTF monogram) + `favicon.ico` fallback — fixes today's 404.
- General CVs FR + EN generated with the existing docx generator (`Candidatures/_outils/`), adapted:
  no employer-specific angle, portfolio link `jordan-tukum.pages.dev`, PostHog/Rust/degree fixes.

## 10. Testing

Vitest (unit, Node environment):

1. Content integrity — every localized field has non-empty `fr` and `en`; slugs unique and match
   the route list; prev/next cycles through all 8; no `[À COMPLÉTER]`/`TODO`/`lorem`; Rust only in the
   "notions" tier; proof-strip test total equals the sum of per-project test counts.
2. i18n parity — `fr.json` and `en.json` have identical key sets.
3. Build output — after `nuxi generate`, all 18 HTML pages exist; each has a unique `<title>`,
   `lang`, canonical and both `hreflang` alternates; both CV PDFs and `404.html` exist.

Quality gate (local and CI): `nuxi typecheck`, `vitest run`, `nuxi generate`, then the build-output
test. Lighthouse checked manually once before merge.

## 11. Deployment

- CI: `.github/workflows/ci.yml` on push/PR — Node 24, `npm ci`, typecheck, tests, generate,
  build-output test; on `main` also deploy `.output/public` to GitHub Pages (`actions/deploy-pages`).
- Rollout, in order:
  1. Work is committed locally on `redesign`; nothing is pushed without the owner's go.
  2. Owner changes the Cloudflare Pages build settings: command `npx nuxi generate`, output
     directory `.output/public`, env `NODE_VERSION=24`. Safe at any time: production keeps serving
     its last successful deployment until something new reaches `main`.
  3. Push `redesign` → Cloudflare builds a preview at `redesign.jordan-tukum.pages.dev`, reviewable
     from the owner's phone on a Cameroonian network.
  4. Owner's go → merge to `main` → production. Owner switches the GitHub Pages source to
     "GitHub Actions" so the mirror deploys from CI.

## 12. Out of scope

Blog, contact form, dark/light switch, CMS, analytics beyond Cloudflare Web Analytics (optional,
owner toggle), animations beyond subtle hover/focus transitions, per-page generated OG images.
