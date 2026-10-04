# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `kiri1101.github.io` as a bilingual (FR/EN) Nuxt 4 static site in the validated « Cahier technique » design, deployable to Cloudflare Pages with a GitHub Pages mirror.

**Architecture:** Nuxt 4 with `nuxi generate` prerenders 18 pages (home + 8 case studies × 2 locales). All copy lives in typed `content/*.ts` modules holding `{ fr, en }` pairs; pages import content and pass it to section components, which localize with a `useLocalized()` composable; leaf UI components take plain strings. Vitest guards content integrity (unit) and the generated HTML (build tests).

**Tech Stack:** Nuxt 4.5, Vue 3, TypeScript 6.0, @nuxtjs/i18n 10.6, @nuxt/fonts 0.14, Tailwind CSS 4.3 (`@tailwindcss/vite`), Vitest 5, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-03-portfolio-redesign-design.md`. Visual reference: canvas artifact `https://claude.ai/artifact/NVc7k2AZgsXP6MQTg6kHaX`, page « Maquette — Cahier technique » (artboards `MockHome`, `MockMobile`, `MockCase`).

**Repository:** `D:\laragon\www\kiri1101.github.io`, branch `redesign`. Shell: Git Bash. Never push without the owner's explicit go (Task 8).

## Global Constraints

- Node 24; TypeScript **6.x** (not 7 — `vue-tsc` compatibility).
- Fully static: `nuxi generate`; no server runtime, no client-side data fetching.
- Locales: `fr` (default, at `/`) and `en` (at `/en`); strategy `prefix_except_default`; no browser-language redirect.
- Site URL for canonical/hreflang/OG: `https://jordan-tukum.pages.dev`. Never put `kiri1101.github.io` in content.
- Case-study slugs, in this order (also the prev/next cycle): `services-publics`, `bornes-libre-service`, `ministere-fonction-publique`, `conformite-bancaire`, `equip4safety`, `tv-satellite`, `schulyf`, `drymhome`. FR route `/projets/<slug>`, EN route `/en/projects/<slug>`.
- Clients named: CAMRAIL, Port Autonome de Douala, CCAA, Ministère de la Fonction Publique, CAMCIS, SWAA Littoral, **Ministère des Finances — DGB** (SERVICES PUBLICS only). All other clients generic.
- Never publish: team sizes per project, usage figures, photos, `[À COMPLÉTER]`/TODO placeholders.
- Design tokens (exact): paper `#F6F7F9`, surface `#FFFFFF`, ink `#13203A`, body `#3A4A66`, muted `#5A6A85`, line `#D5DCE6`, grid `#E6EBF2`, accent `#2E5BA8`, accent-hover `#234A8C`, accent-soft `#EAF0FA`, tint `#EEF2F8`, signal `#E3A32B` (dots only, never text), sky `#8FB3F0`, mist `#A9B6CC`, night `#0E182C`.
- Fonts: Montserrat 400/500/600/700/800 and JetBrains Mono 400/500/700, self-hosted by `@nuxt/fonts`, latin + latin-ext.
- Accessibility: WCAG AA contrast, visible focus ring, skip link, ≥ 44 px touch targets, `prefers-reduced-motion` respected.
- Keep Google site verification meta: `-o3on4T7CLriyCJbh7NAqGm82V76NJrR7eSZ5Uz_WIM`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Language switch on a case study** — expected to open the same project in the other language (`/projets/schulyf` ↔ `/en/projects/schulyf`), not the home page. Pinned in Task 5 (build test on switch-link hrefs).
2. **Navigation links on case-study pages** — "Projets/Projects…" must jump back to the home section (`/#projects`, `/en#projects`), not to an anchor that does not exist on the case page. Pinned in Task 5.
3. **CV download language** — the EN pages must offer the English PDF and the FR pages the French one. Pinned in Task 6.
4. **WhatsApp link** — must be `https://wa.me/237698377389` (digits only), or it opens an error on phones. Pinned in Task 2.
5. **Fixed mobile action bar** — must never cover the last lines of the page on phones. Pinned in Task 3 (layout padding asserted in the home build test) and checked visually at 390 px in Task 7.

---

## File Structure

```
nuxt.config.ts                 modules, i18n, fonts, prerender routes, head defaults
package.json · tsconfig.json · vitest.config.ts · vitest.build.config.ts · .gitignore
content/
  types.ts                     Locale, Localized<T>, all content interfaces, IconName
  profile.ts                   identity, contacts, facts, stats, sectors, delivered-for, cvPath()
  projects.ts                  8 case studies + projectSlugs, getProject(), neighbours()
  other-projects.ts · method.ts · experience.ts · skills.ts · education.ts
i18n/locales/fr.json · en.json UI strings only
app/
  app.vue                      skip link, locale head (lang, canonical, hreflang)
  error.vue                    bilingual 404
  assets/css/main.css          Tailwind import, @theme tokens, base, utilities, button classes
  composables/useLocalized.ts
  layouts/default.vue
  pages/index.vue              home
  pages/projets/[slug].vue     case study
  components/
    layout/  TopBar.vue · LanguageSwitch.vue · OpenBadge.vue · SiteFooter.vue · MobileActionBar.vue
    ui/      AppIcon.vue · Badge.vue · StackPill.vue · SectionHeading.vue · BrowserFrame.vue · KioskSchematic.vue
    home/    HeroSection.vue · ProfileCard.vue · ProofStrip.vue · TrustRow.vue · ProjectGrid.vue · ProjectCard.vue
             MethodSection.vue · CareerTimeline.vue · SkillTiers.vue · OtherProjects.vue · EducationList.vue · ContactBand.vue
    case/    CaseHeader.vue · CaseToc.vue · ArchitectureLayers.vue · QualityStats.vue · PrevNextNav.vue · CtaBand.vue
public/   favicon.svg · favicon.ico · robots.txt · sitemap.xml · og-fr.png · og-en.png · img/*.webp · cv/*.pdf
tests/
  unit/  i18n.test.ts · content.test.ts
  build/ helpers.ts · home.test.ts · case-studies.test.ts · assets.test.ts · cv.test.ts
scripts/og-template.html       source for the two social images
.github/workflows/ci.yml
```

Refinement of spec §5: section components receive their content objects as props from the page and localize them with `useLocalized()`; leaf UI components (`Badge`, `StackPill`, `AppIcon`, …) receive plain strings. `FeaturedProjectCard` and `ProjectCard` are one component with a `featured` prop; `FactPanel` and `KeyDecision` live inside `CaseHeader` and the case page.

---

### Task 1: Scaffold Nuxt 4, Tailwind tokens, fonts, i18n and test runners

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `vitest.build.config.ts`, `app/app.vue`, `app/pages/index.vue` (temporary), `app/assets/css/main.css`, `i18n/locales/fr.json`, `i18n/locales/en.json`, `tests/unit/i18n.test.ts`
- Modify: `.gitignore` (create if missing)

**Interfaces:**
- Produces: npm scripts `dev`, `generate`, `typecheck`, `test`, `test:build`, `check`; Tailwind color utilities `paper surface ink body muted line grid accent accent-hover accent-soft tint signal sky mist night`; utilities `blueprint`, `blueprint-dark`; classes `.btn-primary .btn-secondary .btn-light .btn-outline-light .skip-link`; fonts `font-sans` (Montserrat) and `font-mono` (JetBrains Mono); `useRuntimeConfig().public.siteUrl`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "jordan-tukum-portfolio",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxi dev",
    "generate": "nuxi generate",
    "preview": "npx serve .output/public",
    "typecheck": "nuxi typecheck",
    "test": "vitest run",
    "test:build": "vitest run --config vitest.build.config.ts",
    "check": "npm run typecheck && npm run test && npm run generate && npm run test:build",
    "postinstall": "nuxi prepare"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd /d/laragon/www/kiri1101.github.io
npm install nuxt@^4.5.2 @nuxtjs/i18n@^10.6.0 @nuxt/fonts@^0.14.0
npm install -D tailwindcss@^4.3.3 @tailwindcss/vite@^4.3.3 vitest@^5.0.3 typescript@~6.0.3 vue-tsc@^3.3.12
```
Expected: `package-lock.json` created, no `ERR!` lines. (`postinstall` fails until `nuxt.config.ts` exists — fine; it runs again in Step 9.)

- [ ] **Step 3: Write `.gitignore`**

```gitignore
node_modules
.nuxt
.output
.data
dist
.env
*.log
```

- [ ] **Step 4: Write `nuxt.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite'

const SITE_URL = 'https://jordan-tukum.pages.dev'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@nuxtjs/i18n', '@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  vite: { plugins: [tailwindcss()] },
  runtimeConfig: { public: { siteUrl: SITE_URL } },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      ],
      meta: [
        { name: 'google-site-verification', content: '-o3on4T7CLriyCJbh7NAqGm82V76NJrR7eSZ5Uz_WIM' },
        { name: 'theme-color', content: '#13203A' },
      ],
    },
  },
  i18n: {
    baseUrl: SITE_URL,
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    locales: [
      { code: 'fr', language: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
    ],
  },
  fonts: {
    // global: Tailwind v4 references the families through CSS variables, which font detection can miss
    families: [
      { name: 'Montserrat', provider: 'google', weights: [400, 500, 600, 700, 800], subsets: ['latin', 'latin-ext'], global: true },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 700], subsets: ['latin', 'latin-ext'], global: true },
    ],
  },
  nitro: { prerender: { crawlLinks: true, routes: ['/', '/en'] } },
})
```
(Task 4 Step 10 adds the case-study prerender routes and their custom i18n paths.)

- [ ] **Step 5: Write `tsconfig.json`** (Nuxt 4 project references)

```json
{
  "files": [],
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" }
  ]
}
```

- [ ] **Step 6: Write `app/assets/css/main.css`**

```css
@import "tailwindcss";

@theme {
  --color-paper: #F6F7F9;
  --color-surface: #FFFFFF;
  --color-ink: #13203A;
  --color-body: #3A4A66;
  --color-muted: #5A6A85;
  --color-line: #D5DCE6;
  --color-grid: #E6EBF2;
  --color-accent: #2E5BA8;
  --color-accent-hover: #234A8C;
  --color-accent-soft: #EAF0FA;
  --color-tint: #EEF2F8;
  --color-signal: #E3A32B;
  --color-sky: #8FB3F0;
  --color-mist: #A9B6CC;
  --color-night: #0E182C;
  --font-sans: "Montserrat", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "Cascadia Mono", monospace;
}

@utility blueprint {
  background-image: linear-gradient(var(--color-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-grid) 1px, transparent 1px);
  background-size: 32px 32px;
}

@utility blueprint-dark {
  background-image: linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.05) 1px, transparent 1px);
  background-size: 32px 32px;
}

@layer base {
  html { scroll-behavior: smooth; scroll-padding-top: 5.5rem; }
  body { @apply bg-paper font-sans text-ink antialiased; }
  a { @apply text-accent; }
  a:hover { @apply text-accent-hover; }
  :focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
}

@layer components {
  .btn-primary { @apply inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-lg bg-accent px-7 text-base font-bold text-white no-underline shadow-[0_6px_16px_rgb(46_91_168/0.28)] transition-colors hover:bg-accent-hover hover:text-white; }
  .btn-secondary { @apply inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-ink bg-surface px-7 text-base font-bold text-ink no-underline transition-colors hover:bg-tint hover:text-ink; }
  .btn-light { @apply inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-lg bg-white px-7 text-base font-bold text-ink no-underline transition-colors hover:bg-tint hover:text-ink; }
  .btn-outline-light { @apply inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-white px-7 text-base font-bold text-white no-underline transition-colors hover:bg-white/10 hover:text-white; }
  .skip-link { @apply absolute left-4 -top-20 z-50 rounded-lg bg-ink px-4 py-3 font-semibold text-white no-underline focus:top-4; }
}
```

- [ ] **Step 7: Write the failing i18n parity test `tests/unit/i18n.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import fr from '../../i18n/locales/fr.json'
import en from '../../i18n/locales/en.json'

type Messages = { [key: string]: string | Messages }

function flatten(messages: Messages, prefix = ''): Array<[string, string]> {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'string' ? [[`${prefix}${key}`, value] as [string, string]] : flatten(value, `${prefix}${key}.`))
}

describe('i18n locale files', () => {
  const frEntries = flatten(fr as Messages)
  const enEntries = flatten(en as Messages)

  it('define at least one message', () => {
    expect(frEntries.length).toBeGreaterThan(0)
  })

  it('have identical key sets', () => {
    expect(enEntries.map(([k]) => k).sort()).toEqual(frEntries.map(([k]) => k).sort())
  })

  it('have no empty messages', () => {
    const empty = [...frEntries, ...enEntries].filter(([, v]) => !v.trim()).map(([k]) => k)
    expect(empty).toEqual([])
  })
})
```

- [ ] **Step 8: Write `vitest.config.ts` and `vitest.build.config.ts`, then run the test to see it fail**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
})
```
`vitest.build.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['tests/build/**/*.test.ts'] },
})
```
Run: `npm test`
Expected: FAIL — `Failed to resolve import "../../i18n/locales/fr.json"`.

- [ ] **Step 9: Write the minimal locale files, app shell and temporary page**

`i18n/locales/fr.json`:
```json
{ "site": { "name": "Jordan Tukum Folem" } }
```
`i18n/locales/en.json`:
```json
{ "site": { "name": "Jordan Tukum Folem" } }
```
`app/app.vue`:
```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```
`app/pages/index.vue` (replaced in Task 4):
```vue
<template>
  <h1 class="p-8 text-4xl font-extrabold text-ink">{{ $t('site.name') }}</h1>
</template>
```
Run: `npx nuxi prepare && npm test`
Expected: PASS (3 tests).

- [ ] **Step 10: Verify the static build**

Run: `npm run generate && ls .output/public/index.html .output/public/en/index.html`
Expected: both files listed. If `nuxi typecheck` later reports a type mismatch on the Tailwind Vite plugin, consult the `nuxt-primevue-tailwind` skill (it documents this trap) before changing anything.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json .gitignore nuxt.config.ts tsconfig.json vitest.config.ts vitest.build.config.ts app i18n tests
git commit -m "chore: scaffold Nuxt 4 with Tailwind tokens, fonts, i18n and Vitest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Typed bilingual content and its integrity tests

**Files:**
- Create: `content/types.ts`, `content/profile.ts`, `content/projects.ts`, `content/other-projects.ts`, `content/method.ts`, `content/experience.ts`, `content/skills.ts`, `content/education.ts`, `tests/unit/content.test.ts`

**Interfaces:**
- Produces (exact exports): `types.ts` — `Locale`, `Localized<T>`, `IconName`, `Stat`, `FactRow`, `Profile`, `BadgeTone`, `ProjectBadge`, `ProjectImage`, `ProjectLink`, `ArchitectureLayer`, `QualityItem`, `Project`, `OtherProject`, `MethodItem`, `ExperienceItem`, `SkillTier`, `EducationBadge`, `EducationItem`. `profile.ts` — `profile: Profile`, `cvPath(locale: Locale): string`. `projects.ts` — `projects: Project[]`, `projectSlugs: string[]`, `getProject(slug: string): Project | undefined`, `neighbours(slug: string): { prev: string; next: string }`. `other-projects.ts` — `otherProjects: OtherProject[]`. `method.ts` — `method: MethodItem[]`. `experience.ts` — `experience: ExperienceItem[]`, `distinction: Localized`. `skills.ts` — `skillTiers: SkillTier[]`. `education.ts` — `education: EducationItem[]`.

- [ ] **Step 1: Write the failing test `tests/unit/content.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { cvPath, profile } from '../../content/profile'
import { getProject, neighbours, projects, projectSlugs } from '../../content/projects'
import { otherProjects } from '../../content/other-projects'
import { method } from '../../content/method'
import { distinction, experience } from '../../content/experience'
import { skillTiers } from '../../content/skills'
import { education } from '../../content/education'

const EXPECTED_SLUGS = [
  'services-publics', 'bornes-libre-service', 'ministere-fonction-publique', 'conformite-bancaire',
  'equip4safety', 'tv-satellite', 'schulyf', 'drymhome',
]
const PLACEHOLDER = /\[À COMPLÉTER|TODO|TBD|lorem|XXX/i
const ALL = { profile, projects, otherProjects, method, experience, distinction, skillTiers, education }

type Pair = { fr: unknown; en: unknown }
const isPair = (v: unknown): v is Pair =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === 'en,fr'

function pairs(value: unknown, path: string, out: Array<[string, Pair]> = []): Array<[string, Pair]> {
  if (isPair(value)) out.push([path, value])
  else if (Array.isArray(value)) value.forEach((v, i) => pairs(v, `${path}[${i}]`, out))
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => pairs(v, `${path}.${k}`, out))
  return out
}

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach(v => strings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach(v => strings(v, out))
  return out
}

describe('content', () => {
  const allPairs = pairs(ALL, 'content')
  const allStrings = strings(ALL)

  it('is substantial', () => {
    expect(allPairs.length).toBeGreaterThan(200)
  })

  it('has non-empty French and English text for every localized field', () => {
    const bad = allPairs
      .filter(([, v]) => typeof v.fr !== 'string' || typeof v.en !== 'string' || !v.fr.trim() || !v.en.trim())
      .map(([p]) => p)
    expect(bad).toEqual([])
  })

  it('contains no placeholders', () => {
    expect(allStrings.filter(s => PLACEHOLDER.test(s))).toEqual([])
  })

  it('never links the unreachable GitHub Pages host', () => {
    expect(allStrings.filter(s => /https?:\/\/kiri1101\.github\.io/.test(s))).toEqual([])
  })

  it('lists the eight case studies in the agreed order and exports their slugs', () => {
    expect(projects.map(p => p.slug)).toEqual(EXPECTED_SLUGS)
    expect(projectSlugs).toEqual(EXPECTED_SLUGS)
    expect(projects.map(p => p.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08'])
  })

  it('features exactly the first two projects', () => {
    expect(projects.filter(p => p.featured).map(p => p.slug)).toEqual(['services-publics', 'bornes-libre-service'])
  })

  it('finds projects by slug and cycles prev/next through all of them', () => {
    expect(getProject('schulyf')?.slug).toBe('schulyf')
    expect(getProject('missing')).toBeUndefined()
    expect(neighbours('services-publics')).toEqual({ prev: 'drymhome', next: 'bornes-libre-service' })
    expect(neighbours('drymhome')).toEqual({ prev: 'schulyf', next: 'services-publics' })
    expect(() => neighbours('missing')).toThrow('Unknown project: missing')
  })

  it('gives every project at least three contributions, three architecture layers and three quality items', () => {
    for (const p of projects) {
      expect(p.contribution.length, p.slug).toBeGreaterThanOrEqual(3)
      expect(p.architecture.length, p.slug).toBeGreaterThanOrEqual(3)
      expect(p.quality.length, p.slug).toBe(3)
    }
  })

  it('only uses https links', () => {
    const urls = projects.flatMap(p => p.links.map(l => l.url))
      .concat(otherProjects.flatMap(o => (o.link ? [o.link.url] : [])))
      .concat([profile.linkedinUrl, profile.githubUrl, profile.repoUrl, profile.whatsappUrl])
    expect(urls.filter(u => !u.startsWith('https://'))).toEqual([])
  })

  it('uses a wa.me link made of digits only', () => {
    expect(profile.whatsappUrl).toMatch(/^https:\/\/wa\.me\/\d+$/)
  })

  it('keeps Rust in the "notions" tier only', () => {
    const tiers = skillTiers.filter(t => t.items.some(i => i.en.includes('Rust'))).map(t => t.id)
    expect(tiers).toEqual(['notions'])
  })

  it('backs the tests claim with per-project test counts', () => {
    const stat = profile.stats.find(s => s.label.en === 'Automated tests')
    const claimed = Number(stat?.value.en.replace(/\D/g, ''))
    const total = projects.reduce((n, p) => n + (p.testCount ?? 0), 0)
    expect(claimed).toBe(2000)
    expect(total).toBeGreaterThanOrEqual(claimed)
  })

  it('backs the sectors claim with the list of sectors', () => {
    const stat = profile.stats.find(s => s.label.en === 'Sectors')
    expect(profile.sectors).toHaveLength(Number(stat?.value.en))
  })

  it('builds CV paths per locale', () => {
    expect(cvPath('fr')).toBe('/cv/CV_Jordan_TUKUM_FOLEM_FR.pdf')
    expect(cvPath('en')).toBe('/cv/CV_Jordan_TUKUM_FOLEM_EN.pdf')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../../content/profile"`.

- [ ] **Step 3: Write `content/types.ts`**

```ts
export type Locale = 'fr' | 'en'
export interface Localized<T = string> { fr: T; en: T }

export type IconName =
  | 'check' | 'refresh' | 'file' | 'users' | 'shield' | 'download' | 'mail' | 'chat' | 'menu' | 'close' | 'arrow-up-right'

export interface Stat { value: Localized; label: Localized; caption: Localized }
export interface FactRow { label: Localized; value: Localized }

export interface Profile {
  name: string
  title: Localized
  location: Localized
  valueProp: Localized
  valuePropShort: Localized
  email: string
  phone: string
  whatsappUrl: string
  linkedinUrl: string
  githubUrl: string
  repoUrl: string
  facts: FactRow[]
  stats: Stat[]
  sectors: Localized[]
  deliveredFor: Localized[]
}

export type BadgeTone = 'live' | 'proof' | 'plain'
export interface ProjectBadge { tone: BadgeTone; label: Localized }

export type ProjectImage =
  | { kind: 'screenshot'; src: string; alt: Localized; url: string; position: string }
  | { kind: 'kiosk' }
  | { kind: 'none' }

export interface ProjectLink { kind: 'live' | 'demo' | 'code'; url: string; label: string }
export interface ArchitectureLayer { label: Localized; description: Localized }
export interface QualityItem { value: Localized; label: Localized }

export interface Project {
  slug: string
  number: string
  featured: boolean
  sector: Localized
  title: Localized
  summary: Localized
  role: Localized
  period: Localized
  organisation: Localized
  stack: string[]
  badges: ProjectBadge[]
  links: ProjectLink[]
  image: ProjectImage
  testCount?: number
  context: Localized
  contribution: Localized[]
  architecture: ArchitectureLayer[]
  keyDecision?: Localized
  quality: QualityItem[]
  result: Localized
}

export interface OtherProject { title: Localized; description: Localized; link?: { url: string } }
export interface MethodItem { icon: IconName; title: Localized; text: Localized; short: Localized }
export interface ExperienceItem { period: Localized; role: Localized; company: string; text: Localized; current: boolean }
export interface SkillTier { id: 'core' | 'also' | 'notions'; title: Localized; items: Localized[] }
export interface EducationBadge { tone: 'proof' | 'plain'; label: Localized }
export interface EducationItem { title: Localized; school: Localized; year: string; badges: EducationBadge[] }
```

- [ ] **Step 4: Write `content/profile.ts`**

```ts
import type { Locale, Localized, Profile } from './types'

const same = (text: string): Localized => ({ fr: text, en: text })

export const profile: Profile = {
  name: 'Jordan Tukum Folem',
  title: { fr: 'Développeur Full Stack Web & Mobile', en: 'Full Stack Web & Mobile Developer' },
  location: { fr: 'Douala, Cameroun', en: 'Douala, Cameroon' },
  valueProp: {
    fr: 'Je conçois, teste et mets en production des plateformes web et mobiles utilisées à l’échelle nationale — pour des ministères, la CAMRAIL, le Port Autonome de Douala et l’Autorité Aéronautique du Cameroun.',
    en: 'I design, test and ship web and mobile platforms used at national scale — for government ministries, CAMRAIL, the Port of Douala and the Cameroon Civil Aviation Authority.',
  },
  valuePropShort: {
    fr: 'Je conçois, teste et mets en production des plateformes web et mobiles utilisées à l’échelle nationale.',
    en: 'I design, test and ship web and mobile platforms used at national scale.',
  },
  email: 'jtukum@outlook.com',
  phone: '+237 698 377 389',
  whatsappUrl: 'https://wa.me/237698377389',
  linkedinUrl: 'https://linkedin.com/in/jordan-tukum-811017137',
  githubUrl: 'https://github.com/kiri1101',
  repoUrl: 'https://github.com/kiri1101/kiri1101.github.io',
  facts: [
    { label: { fr: 'Poste actuel', en: 'Current role' }, value: { fr: 'Lead Développeur Full Stack, ADWA SARL', en: 'Lead Full Stack Developer, ADWA SARL' } },
    { label: { fr: 'Cœur de stack', en: 'Core stack' }, value: same('Laravel · Vue.js / Nuxt · React · TypeScript') },
    { label: { fr: 'Équipes', en: 'Teams' }, value: { fr: 'Lead de 3 à 6 développeurs, en Agile', en: 'Lead of 3–6 developers, Agile' } },
    { label: { fr: 'Formation', en: 'Education' }, value: { fr: 'BTech Génie Logiciel · BTech Génie Électrique', en: 'BTech Software Engineering · BTech Electrical Engineering' } },
    { label: { fr: 'Langues', en: 'Languages' }, value: { fr: 'Français · Anglais (bilingue)', en: 'French · English (bilingual)' } },
  ],
  stats: [
    { value: same('5+'), label: { fr: 'Ans d’expérience', en: 'Years of experience' }, caption: { fr: 'en production depuis 2020', en: 'shipping to production since 2020' } },
    { value: same('3–6'), label: { fr: 'Développeurs encadrés', en: 'Developers led' }, caption: { fr: 'lead technique chez ADWA', en: 'technical lead at ADWA' } },
    { value: { fr: '2 000+', en: '2,000+' }, label: { fr: 'Tests automatisés', en: 'Automated tests' }, caption: { fr: 'sur mes projets récents', en: 'across my recent projects' } },
    { value: same('10'), label: { fr: 'Secteurs', en: 'Sectors' }, caption: { fr: 'public, transport, aviation, banque…', en: 'public sector, transport, aviation, banking…' } },
  ],
  sectors: [
    { fr: 'Secteur public', en: 'Public sector' },
    { fr: 'Transport', en: 'Transport' },
    { fr: 'Aviation', en: 'Aviation' },
    { fr: 'Banque & finance', en: 'Banking & finance' },
    { fr: 'Douanes & commerce', en: 'Customs & trade' },
    { fr: 'Paiements', en: 'Payments' },
    { fr: 'Éducation', en: 'Education' },
    { fr: 'ONG', en: 'NGOs' },
    { fr: 'Immobilier', en: 'Real estate' },
    { fr: 'Médias', en: 'Media' },
  ],
  deliveredFor: [
    same('CAMRAIL'),
    { fr: 'Port Autonome de Douala', en: 'Port of Douala' },
    { fr: 'Autorité Aéronautique du Cameroun', en: 'Cameroon Civil Aviation Authority' },
    { fr: 'Ministère des Finances', en: 'Ministry of Finance' },
    { fr: 'Ministère de la Fonction Publique', en: 'Ministry of Public Service' },
    same('CAMCIS'),
    same('SWAA Littoral'),
  ],
}

export function cvPath(locale: Locale): string {
  return `/cv/CV_Jordan_TUKUM_FOLEM_${locale.toUpperCase()}.pdf`
}
```

- [ ] **Step 5: Write `content/projects.ts`**

```ts
import type { Localized, Project } from './types'

const same = (text: string): Localized => ({ fr: text, en: text })
const lead: Localized = { fr: 'Lead développeur', en: 'Lead developer' }
const designDev: Localized = { fr: 'Conception & développement', en: 'Design & development' }

export const projects: Project[] = [
  {
    slug: 'services-publics',
    number: '01',
    featured: true,
    sector: { fr: 'Secteur public · E-gouvernement', en: 'Public sector · E-government' },
    title: same('SERVICES PUBLICS'),
    summary: {
      fr: 'Le portail national qui centralise les démarches administratives et la collecte des recettes non fiscales : comptes usagers avec OTP, déclarations et pièces justificatives, paiements en ligne.',
      en: 'The national portal for administrative procedures and non-tax revenue collection: user accounts with OTP, declarations with supporting documents, online payments.',
    },
    role: lead,
    period: { fr: '2023 — aujourd’hui', en: '2023 — present' },
    organisation: {
      fr: 'Ministère des Finances — Direction Générale du Budget · réalisé chez ADWA SARL',
      en: 'Ministry of Finance — Directorate General of Budget · delivered at ADWA SARL',
    },
    stack: ['Laravel', 'Vue 3', 'Inertia (SSR)', 'Laravel Echo', 'Docker'],
    badges: [
      { tone: 'live', label: { fr: 'En ligne', en: 'Live' } },
      { tone: 'proof', label: same('≈ 900 commits') },
    ],
    links: [{ kind: 'live', url: 'https://services-publics.cm/services/publics', label: 'services-publics.cm' }],
    image: {
      kind: 'screenshot',
      src: '/img/services-publics.webp',
      alt: { fr: 'Page d’accueil du portail SERVICES PUBLICS', en: 'SERVICES PUBLICS portal home page' },
      url: 'https://services-publics.cm/services/publics',
      position: 'top',
    },
    context: {
      fr: 'Les démarches administratives et la collecte des recettes non fiscales relèvent de nombreux ministères. SERVICES PUBLICS, plateforme du Ministère des Finances, les rassemble dans un portail unique où l’usager crée son compte, constitue son dossier et règle ses frais en ligne.',
      en: 'Administrative procedures and non-tax revenue collection span many ministries. SERVICES PUBLICS, a Ministry of Finance platform, brings them into a single portal where users create an account, build their file and pay their fees online.',
    },
    contribution: [
      {
        fr: 'Lead développeur du front-office et du back-office — principal contributeur, avec environ 90 % des quelque 900 commits depuis 2023.',
        en: 'Lead developer of the front office and back office — main contributor, with about 90% of the roughly 900 commits since 2023.',
      },
      {
        fr: 'Parcours usager complet : inscription, authentification par OTP, consultation des services, déclarations avec pièces justificatives, paiement en ligne ou bancaire.',
        en: 'End-to-end user journey: sign-up, OTP authentication, service catalogue, declarations with supporting documents, online or bank payment.',
      },
      {
        fr: 'Rendu côté serveur (SSR) pour un premier affichage rapide et un bon référencement.',
        en: 'Server-side rendering (SSR) for a fast first paint and good search visibility.',
      },
    ],
    architecture: [
      { label: { fr: 'Navigateur', en: 'Browser' }, description: { fr: 'Vue 3 + Inertia, rendu serveur (SSR)', en: 'Vue 3 + Inertia, server-side rendered' } },
      { label: same('Routes'), description: { fr: 'Espaces séparés : public, usager authentifié, authentification, paiements', en: 'Separate areas: public, signed-in user, authentication, payments' } },
      { label: { fr: 'Métier', en: 'Business logic' }, description: { fr: 'Classes Action à responsabilité unique · middlewares d’authentification, de journalisation et de contrôle des téléversements', en: 'Single-responsibility Action classes · middleware for authentication, logging and upload checks' } },
      { label: same('Services'), description: { fr: 'Paiement en ligne et bancaire · stockage des pièces · notifications temps réel', en: 'Online and bank payment · document storage · real-time notifications' } },
    ],
    keyDecision: {
      fr: 'Isoler la logique métier dans des classes Action plutôt que dans les contrôleurs, pour la tester et la réutiliser entre les parcours.',
      en: 'Keep business logic in Action classes rather than controllers, so it can be tested and reused across user journeys.',
    },
    quality: [
      { value: same('≈ 900'), label: { fr: 'Commits depuis 2023', en: 'Commits since 2023' } },
      { value: same('PHPUnit'), label: { fr: 'Tests unitaires et fonctionnels', en: 'Unit and feature tests' } },
      { value: same('Docker'), label: { fr: 'Environnements conteneurisés', en: 'Containerised environments' } },
    ],
    result: { fr: 'En production sur services-publics.cm.', en: 'In production at services-publics.cm.' },
  },
  {
    slug: 'bornes-libre-service',
    number: '02',
    featured: true,
    sector: { fr: 'Transport · Bornes interactives', en: 'Transport · Self-service kiosks' },
    title: { fr: 'Bornes en libre-service', en: 'Self-service kiosks' },
    summary: {
      fr: 'La billetterie CAMRAIL sur bornes interactives en gares de Douala et Yaoundé, puis une borne multiservices pour un transporteur interurbain : imprimante thermique, lecteur QR et scanner de pièces d’identité.',
      en: 'CAMRAIL ticketing on interactive kiosks in Douala and Yaoundé stations, then a multi-service kiosk for an intercity bus operator: thermal printer, QR reader and ID-document scanner.',
    },
    role: lead,
    period: { fr: '2023 — aujourd’hui', en: '2023 — present' },
    organisation: {
      fr: 'CAMRAIL et un transporteur interurbain · réalisé chez ADWA SARL',
      en: 'CAMRAIL and an intercity bus operator · delivered at ADWA SARL',
    },
    stack: ['Tauri 2', 'Nuxt 4', 'Nitro', 'Laravel', 'Inertia'],
    badges: [
      { tone: 'live', label: { fr: 'Déployé en gares', en: 'Deployed in stations' } },
      { tone: 'proof', label: { fr: 'Matériel + logiciel', en: 'Hardware + software' } },
    ],
    links: [],
    image: { kind: 'kiosk' },
    context: {
      fr: 'Acheter un billet de train ou de bus suppose souvent de faire la queue au guichet. Les bornes en libre-service permettent de rechercher un trajet, de payer et d’imprimer son billet sans agent.',
      en: 'Buying a train or bus ticket usually means queuing at a counter. Self-service kiosks let travellers search a trip, pay and print their ticket without an agent.',
    },
    contribution: [
      {
        fr: 'Billetterie CAMRAIL : application web de vente de billets déployée sur des bornes interactives dans les gares de Douala et Yaoundé.',
        en: 'CAMRAIL ticketing: a web ticket-sales application deployed on interactive kiosks in Douala and Yaoundé stations.',
      },
      {
        fr: 'Borne multiservices : seul développeur du client borne (Tauri 2 + Nuxt 4) et de l’API façade (Nuxt / Nitro) qui le relie à l’ERP du transporteur.',
        en: 'Multi-service kiosk: sole developer of the kiosk client (Tauri 2 + Nuxt 4) and of the façade API (Nuxt / Nitro) that connects it to the operator’s ERP.',
      },
      {
        fr: 'Pilotage des périphériques : imprimante thermique, lecteur de QR codes, scanner de passeports et de pièces d’identité.',
        en: 'Peripheral control: thermal printer, QR-code reader, passport and ID-document scanner.',
      },
    ],
    architecture: [
      { label: { fr: 'Borne', en: 'Kiosk' }, description: { fr: 'Application Windows verrouillée : Tauri 2 + Nuxt 4, écran 1280 × 1024', en: 'Locked-down Windows app: Tauri 2 + Nuxt 4, 1280 × 1024 screen' } },
      { label: { fr: 'Périphériques', en: 'Peripherals' }, description: { fr: 'Imprimante thermique, lecteur QR, scanner d’identité via un module natif Tauri', en: 'Thermal printer, QR reader, ID scanner through a native Tauri sidecar' } },
      { label: { fr: 'Façade', en: 'Façade' }, description: { fr: 'Service hébergé Nuxt / Nitro qui détient les identifiants et adapte les réponses de l’ERP', en: 'Hosted Nuxt / Nitro service that holds the credentials and reshapes ERP responses' } },
      { label: same('ERP'), description: { fr: 'Tarifs, places disponibles et émission des billets côté transporteur', en: 'Fares, seat availability and ticket issuance on the operator side' } },
    ],
    keyDecision: {
      fr: 'Faire de la borne un client léger : aucun identifiant, aucun tarif et aucune donnée persistée sur la machine. Tout passe par la façade hébergée, ce qui limite l’impact d’une borne compromise.',
      en: 'Make the kiosk a thin client: no credentials, no fares and no persisted data on the machine. Everything goes through the hosted façade, which limits the damage a compromised kiosk could do.',
    },
    quality: [
      { value: same('150+'), label: { fr: 'Commits sur le client borne', en: 'Commits on the kiosk client' } },
      { value: same('OpenSpec'), label: { fr: 'Spécification exécutable et journal des décisions', en: 'Executable specification and decision log' } },
      { value: same('0'), label: { fr: 'Donnée stockée sur la borne', en: 'Data stored on the kiosk' } },
    ],
    result: {
      fr: 'Billetterie CAMRAIL en service sur bornes en gares de Douala et Yaoundé ; borne multiservices en préparation pour un pilote de deux bornes sur l’axe Douala–Yaoundé.',
      en: 'CAMRAIL ticketing running on kiosks in Douala and Yaoundé stations; the multi-service kiosk is being prepared for a two-kiosk pilot on the Douala–Yaoundé route.',
    },
  },
  {
    slug: 'ministere-fonction-publique',
    number: '03',
    featured: false,
    sector: { fr: 'Secteur public · Procédures', en: 'Public sector · Procedures' },
    title: { fr: 'Ministère de la Fonction Publique', en: 'Ministry of Public Service' },
    summary: {
      fr: 'Plateforme de référence des procédures administratives : étapes, pièces requises et contacts de chaque service public.',
      en: 'Reference platform for administrative procedures: steps, required documents and contacts for every public service.',
    },
    role: lead,
    period: same('2025 — 2026'),
    organisation: {
      fr: 'Ministère de la Fonction Publique et de la Réforme Administrative · réalisé chez ADWA SARL',
      en: 'Ministry of Public Service and Administrative Reform · delivered at ADWA SARL',
    },
    stack: ['Laravel 12', 'Sanctum', 'Pest', 'React', 'TypeScript'],
    badges: [
      { tone: 'proof', label: same('280+ tests') },
      { tone: 'proof', label: { fr: 'Contrat d’API testé', en: 'Tested API contract' } },
    ],
    links: [{ kind: 'live', url: 'https://servicepublic.gov.cm', label: 'servicepublic.gov.cm' }],
    image: { kind: 'none' },
    testCount: 282,
    context: {
      fr: 'Pour chaque service public, l’usager doit savoir quelles étapes suivre, quelles pièces fournir et qui contacter. La plateforme centralise ces informations et permet à l’administration de les tenir à jour.',
      en: 'For every public service, citizens need to know which steps to follow, which documents to provide and whom to contact. The platform centralises this information and lets the administration keep it up to date.',
    },
    contribution: [
      {
        fr: 'Lead développeur de l’API Laravel et de l’interface React / TypeScript.',
        en: 'Lead developer of the Laravel API and the React / TypeScript interface.',
      },
      {
        fr: 'Contrôle d’accès en quatre niveaux (public, usager, administrateur, super-administrateur), validation systématique par Form Requests, limitation de débit et cache HTTP (ETag) sur les routes exposées.',
        en: 'Four-level access control (public, citizen, admin, super-admin), systematic Form Request validation, rate limiting and HTTP caching (ETag) on exposed routes.',
      },
      {
        fr: 'Migration vers Laravel 12, revues de code, audits et registre de remédiation documentés.',
        en: 'Upgrade to Laravel 12, code reviews, audits and a documented remediation log.',
      },
    ],
    architecture: [
      { label: same('Client'), description: { fr: 'Application React 18 + TypeScript', en: 'React 18 + TypeScript application' } },
      { label: same('API'), description: { fr: 'Laravel 12, authentification Sanctum, une Form Request par route', en: 'Laravel 12, Sanctum authentication, one Form Request per route' } },
      { label: { fr: 'Accès', en: 'Access' }, description: { fr: 'Quatre niveaux : public, usager, administrateur, super-administrateur', en: 'Four levels: public, citizen, admin, super-admin' } },
      { label: { fr: 'Contrat', en: 'Contract' }, description: { fr: 'Référence des routes générée depuis le code (php artisan docs:routes)', en: 'Route reference generated from the code (php artisan docs:routes)' } },
    ],
    keyDecision: {
      fr: 'Générer la référence des routes depuis le code et faire échouer la suite de tests si elle n’est plus à jour : le client et l’API ne peuvent plus diverger en silence.',
      en: 'Generate the route reference from the code and fail the test suite when it is stale: the client and the API can no longer drift apart silently.',
    },
    quality: [
      { value: same('280+'), label: { fr: 'Tests Pest', en: 'Pest tests' } },
      { value: same('ADR'), label: { fr: 'Décisions d’architecture documentées', en: 'Documented architecture decisions' } },
      { value: same('12'), label: { fr: 'Version de Laravel après migration', en: 'Laravel version after upgrade' } },
    ],
    result: {
      fr: 'Une API documentée, sécurisée par rôles et couverte par plus de 280 tests, avec un contrat que le client peut suivre sans surprise.',
      en: 'A documented, role-secured API covered by more than 280 tests, with a contract the client can rely on.',
    },
  },
  {
    slug: 'conformite-bancaire',
    number: '04',
    featured: false,
    sector: { fr: 'Finance · Conformité', en: 'Finance · Compliance' },
    title: { fr: 'Conformité bancaire', en: 'Banking compliance' },
    summary: {
      fr: 'Collecte, contrôle et suivi de la documentation clients exigée des banques pour les transferts internationaux.',
      en: 'Collecting, checking and tracking the client documentation banks must hold for international transfers.',
    },
    role: lead,
    period: { fr: 'déc. 2025 — 2026', en: 'Dec 2025 — 2026' },
    organisation: {
      fr: 'Établissements bancaires de la zone CEMAC · réalisé chez ADWA SARL',
      en: 'Banks in the CEMAC zone · delivered at ADWA SARL',
    },
    stack: ['Nuxt 4', 'TypeScript', 'Zod', 'PrimeVue', 'Vitest'],
    badges: [
      { tone: 'proof', label: same('180+ tests') },
      { tone: 'proof', label: { fr: 'Zone CEMAC', en: 'CEMAC zone' } },
    ],
    links: [],
    image: { kind: 'none' },
    testCount: 181,
    context: {
      fr: 'Dans la zone CEMAC, chaque transfert international doit être justifié par une documentation client complète et à jour. Lors des audits, une banque incapable de la produire s’expose à de lourdes sanctions.',
      en: 'In the CEMAC zone, every international transfer must be backed by complete, up-to-date client documentation. During audits, a bank that cannot produce it faces heavy penalties.',
    },
    contribution: [
      {
        fr: 'Lead développeur du front-end Nuxt 4, organisé en Backend-for-Frontend : les routes serveur Nuxt dialoguent avec l’API et le navigateur ne voit jamais les secrets.',
        en: 'Lead developer of the Nuxt 4 front end, built as a Backend-for-Frontend: Nuxt server routes talk to the API, so the browser never sees secrets.',
      },
      {
        fr: 'Formulaires dynamiques validés par Zod, téléversement des pièces, interface bilingue.',
        en: 'Dynamic forms validated with Zod, document uploads, bilingual interface.',
      },
      {
        fr: 'Mise en place de la suite de tests Vitest et de la vérification de types comme garde-fou à chaque changement.',
        en: 'Set up the Vitest suite and type checking as a gate on every change.',
      },
    ],
    architecture: [
      { label: { fr: 'Navigateur', en: 'Browser' }, description: { fr: 'Pages Nuxt 4 + PrimeVue, formulaires dynamiques', en: 'Nuxt 4 pages + PrimeVue, dynamic forms' } },
      { label: same('BFF'), description: { fr: 'Routes serveur Nuxt (Nitro) : session, appels API, normalisation des erreurs', en: 'Nuxt (Nitro) server routes: session, API calls, error normalisation' } },
      { label: same('Validation'), description: { fr: 'Schémas Zod et utilitaires de validation côté serveur', en: 'Zod schemas and validation utilities on the server' } },
      { label: { fr: 'Logique', en: 'Logic' }, description: { fr: 'Décisions métier extraites en fonctions pures testées', en: 'Business decisions extracted into tested pure functions' } },
    ],
    keyDecision: {
      fr: 'Extraire les décisions des pages — quelle route ouvrir, quel mode d’affichage, quel champ verrouiller — dans des fonctions pures testées : la logique métier est couverte sans navigateur.',
      en: 'Extract page decisions — which route to open, which display mode, which field to lock — into tested pure functions, so business logic is covered without a browser.',
    },
    quality: [
      { value: same('180+'), label: { fr: 'Tests Vitest', en: 'Vitest tests' } },
      { value: same('0'), label: { fr: 'Erreur de typage (nuxt typecheck)', en: 'Type errors (nuxt typecheck)' } },
      { value: same('BFF'), label: { fr: 'Secrets gardés côté serveur', en: 'Secrets kept server-side' } },
    ],
    result: {
      fr: 'Une application qui guide les équipes bancaires dans la constitution et la mise à jour des dossiers exigés lors des audits.',
      en: 'An application that guides bank staff in building and updating the files auditors require.',
    },
  },
  {
    slug: 'equip4safety',
    number: '05',
    featured: false,
    sector: { fr: 'Aviation · Marketplace B2B', en: 'Aviation · B2B marketplace' },
    title: same('EQUIP4SAFETY'),
    summary: {
      fr: 'Marketplace d’équipements aéronautiques entre États membres de l’OACI, commanditée par l’Autorité Aéronautique du Cameroun.',
      en: 'Aviation equipment marketplace for ICAO member states, commissioned by the Cameroon Civil Aviation Authority.',
    },
    role: { fr: 'Pilotage technique & coordination', en: 'Technical lead & coordination' },
    period: same('2025 — 2026'),
    organisation: {
      fr: 'Autorité Aéronautique du Cameroun (CCAA) · réalisé chez ADWA SARL',
      en: 'Cameroon Civil Aviation Authority (CCAA) · delivered at ADWA SARL',
    },
    stack: ['Laravel 12', 'Sanctum', 'Next.js 15', 'React 19', 'next-intl'],
    badges: [
      { tone: 'live', label: { fr: 'Démo en ligne', en: 'Live demo' } },
      { tone: 'proof', label: { fr: 'OACI / CCAA', en: 'ICAO / CCAA' } },
    ],
    links: [{ kind: 'demo', url: 'https://demo.equip4safety.org/marketplace', label: 'demo.equip4safety.org' }],
    image: {
      kind: 'screenshot',
      src: '/img/equip4safety.webp',
      alt: {
        fr: 'Marketplace EQUIP4SAFETY : équipements vérifiés publiés par l’Autorité Aéronautique du Cameroun',
        en: 'EQUIP4SAFETY marketplace: verified equipment listed by the Cameroon Civil Aviation Authority',
      },
      url: 'https://demo.equip4safety.org/marketplace',
      position: 'center 62%',
    },
    context: {
      fr: 'Les autorités et opérateurs aéronautiques disposent d’équipements — balisage, véhicules d’intervention, radio — qu’ils pourraient vendre, louer ou échanger. EQUIP4SAFETY leur offre une place de marché commune, avec des fournisseurs vérifiés.',
      en: 'Aviation authorities and operators hold equipment — airfield lighting, rescue vehicles, radio — that they could sell, lease or exchange. EQUIP4SAFETY gives them a shared marketplace with verified suppliers.',
    },
    contribution: [
      {
        fr: 'Pilotage technique du projet et coordination de l’équipe de développement.',
        en: 'Technical lead of the project and coordination of the development team.',
      },
      {
        fr: 'Contributions à l’API Laravel et au front-end Next.js.',
        en: 'Contributions to the Laravel API and the Next.js front end.',
      },
      {
        fr: 'Représentation du projet au sein de la délégation officielle de la CCAA à l’AFI Aviation Week 2025, à Victoria Falls (Zimbabwe).',
        en: 'Represented the project within the CCAA’s official delegation at AFI Aviation Week 2025 in Victoria Falls, Zimbabwe.',
      },
    ],
    architecture: [
      { label: same('API'), description: { fr: 'Laravel 12 · authentification Sanctum · e-mails transactionnels SendGrid', en: 'Laravel 12 · Sanctum authentication · SendGrid transactional email' } },
      { label: { fr: 'Interface', en: 'Front end' }, description: { fr: 'Next.js 15 / React 19, interface multilingue (next-intl)', en: 'Next.js 15 / React 19, multilingual interface (next-intl)' } },
      { label: same('Catalogue'), description: { fr: 'Annonces d’équipements, fournisseurs vérifiés, demandes de prix', en: 'Equipment listings, verified suppliers, requests for quotation' } },
    ],
    quality: [
      { value: { fr: 'Démo', en: 'Demo' }, label: { fr: 'Publique et en ligne', en: 'Public and online' } },
      { value: { fr: 'OACI', en: 'ICAO' }, label: { fr: 'États membres visés', en: 'Member states targeted' } },
      { value: same('2025'), label: { fr: 'Présenté à l’AFI Aviation Week', en: 'Presented at AFI Aviation Week' } },
    ],
    result: {
      fr: 'Démo publique en ligne sur demo.equip4safety.org ; projet présenté lors de l’AFI Aviation Week 2025.',
      en: 'Public demo live at demo.equip4safety.org; the project was presented at AFI Aviation Week 2025.',
    },
  },
  {
    slug: 'tv-satellite',
    number: '06',
    featured: false,
    sector: { fr: 'Médias · Application mobile', en: 'Media · Mobile app' },
    title: { fr: 'Abonnements TV par satellite', en: 'Satellite TV subscriptions' },
    summary: {
      fr: 'Application Android, API mobile et back-office : abonnements, renouvellements, paiement Mobile Money et OTP par SMS.',
      en: 'Android app, mobile API and back office: subscriptions, renewals, Mobile Money payments and SMS OTP.',
    },
    role: { fr: 'Développeur principal', en: 'Main developer' },
    period: same('2024 — 2026'),
    organisation: {
      fr: 'Un opérateur de télévision par satellite · réalisé chez ADWA SARL',
      en: 'A satellite TV operator · delivered at ADWA SARL',
    },
    stack: ['Laravel 10', 'Inertia (SSR)', 'Vue 3', 'Quasar', 'MeSomb', 'Vonage'],
    badges: [
      { tone: 'proof', label: same('Android') },
      { tone: 'proof', label: same('Mobile Money') },
    ],
    links: [],
    image: { kind: 'none' },
    context: {
      fr: 'Les abonnés d’un opérateur de télévision par satellite doivent pouvoir souscrire, renouveler et payer depuis leur téléphone, tandis que l’équipe gère abonnements, commandes et support depuis un back-office.',
      en: 'Subscribers of a satellite TV operator need to subscribe, renew and pay from their phone, while staff manage subscriptions, orders and support from a back office.',
    },
    contribution: [
      {
        fr: 'Développeur principal du back-end Laravel, qui sert à la fois le back-office web et l’API mobile.',
        en: 'Main developer of the Laravel back end, which serves both the web back office and the mobile API.',
      },
      { fr: 'Application Android packagée avec Quasar.', en: 'Android app packaged with Quasar.' },
      {
        fr: 'Paiement Mobile Money via MeSomb, vérification par OTP envoyé par SMS, porte-monnaie et tickets de support.',
        en: 'Mobile Money payments through MeSomb, SMS OTP verification, wallet and support tickets.',
      },
    ],
    architecture: [
      { label: same('Mobile'), description: { fr: 'Application Android (Quasar) consommant l’API JSON', en: 'Android app (Quasar) consuming the JSON API' } },
      { label: { fr: 'Back-office', en: 'Back office' }, description: { fr: 'Laravel + Inertia / Vue 3 avec rendu serveur', en: 'Laravel + Inertia / Vue 3, server-side rendered' } },
      { label: same('API'), description: { fr: 'Enveloppe JSON commune pour toutes les réponses', en: 'One shared JSON envelope for every response' } },
      { label: same('Services'), description: { fr: 'MeSomb (Mobile Money) · Vonage (SMS / OTP)', en: 'MeSomb (Mobile Money) · Vonage (SMS / OTP)' } },
    ],
    keyDecision: {
      fr: 'Une seule base Laravel pour deux surfaces — back-office web et API mobile — avec un format de réponse unique, pour ne maintenir qu’un seul modèle métier.',
      en: 'One Laravel codebase for two surfaces — web back office and mobile API — with a single response format, so there is only one business model to maintain.',
    },
    quality: [
      { value: same('Android'), label: { fr: 'Application packagée avec Quasar', en: 'App packaged with Quasar' } },
      { value: same('XAF'), label: { fr: 'Paiements Mobile Money', en: 'Mobile Money payments' } },
      { value: same('SSR'), label: { fr: 'Back-office rendu côté serveur', en: 'Server-rendered back office' } },
    ],
    result: {
      fr: 'Abonnements, renouvellements et paiements gérés de bout en bout, du téléphone de l’abonné au back-office.',
      en: 'Subscriptions, renewals and payments handled end to end, from the subscriber’s phone to the back office.',
    },
  },
  {
    slug: 'schulyf',
    number: '07',
    featured: false,
    sector: { fr: 'Éducation · Projet indépendant', en: 'Education · Independent project' },
    title: same('SchuLyf'),
    summary: {
      fr: 'Gestion universitaire : admissions, reçus signés (HMAC) vérifiables en ligne, accès aux examens selon la situation financière.',
      en: 'University administration: admissions, HMAC-signed receipts verifiable online, exam access based on payment standing.',
    },
    role: designDev,
    period: { fr: 'avr. — juil. 2026', en: 'Apr — Jul 2026' },
    organisation: { fr: 'Projet indépendant pour les universités camerounaises', en: 'Independent project for Cameroonian universities' },
    stack: ['Laravel 13', 'Inertia', 'Vue 3', 'PrimeVue', 'Tailwind CSS', 'Pest'],
    badges: [
      { tone: 'live', label: { fr: 'Code public', en: 'Public code' } },
      { tone: 'proof', label: same('580+ tests') },
    ],
    links: [{ kind: 'code', url: 'https://github.com/kiri1101/student-management-system', label: 'github.com/kiri1101/student-management-system' }],
    image: { kind: 'none' },
    testCount: 584,
    context: {
      fr: 'Dans beaucoup d’universités, les admissions passent par des dossiers papier, les paiements par des reçus bancaires portés à la main et les annonces par le bouche-à-oreille. Un reçu perdu ou falsifié devient source de conflit.',
      en: 'In many universities, admissions run on paper files, payments on hand-carried bank slips and announcements on word of mouth. A lost or forged receipt becomes a source of dispute.',
    },
    contribution: [
      {
        fr: 'Conception et développement complets : modélisation, back-end, interface, tests et documentation.',
        en: 'Full design and development: data model, back end, interface, tests and documentation.',
      },
      {
        fr: 'Admissions en ligne triées par les agents de la scolarité ; l’admis devient étudiant.',
        en: 'Online admissions triaged by student-affairs officers; an admitted applicant becomes a student.',
      },
      {
        fr: 'Paiement par versements datés : situation financière calculée en temps réel, accès aux examens et reports gérés en conséquence.',
        en: 'Instalment payments: payment standing computed live, with exam access and deferrals handled accordingly.',
      },
    ],
    architecture: [
      { label: { fr: 'Interface', en: 'Interface' }, description: same('Inertia + Vue 3, PrimeVue, Tailwind CSS v4') },
      { label: same('Back-end'), description: { fr: 'Laravel 13, authentification Fortify, routes typées (Wayfinder)', en: 'Laravel 13, Fortify authentication, typed routes (Wayfinder)' } },
      { label: { fr: 'Reçus', en: 'Receipts' }, description: { fr: 'Reçu PDF unique signé HMAC + point de vérification public', en: 'Single HMAC-signed PDF receipt + public verification endpoint' } },
    ],
    keyDecision: {
      fr: 'Un reçu unique, signé par HMAC et vérifiable via un lien public : un reçu perdu ou falsifié n’est plus une source de litige.',
      en: 'One receipt, HMAC-signed and verifiable through a public link: a lost or forged receipt is no longer a source of dispute.',
    },
    quality: [
      { value: same('580+'), label: { fr: 'Tests Pest, dont tests navigateur', en: 'Pest tests, including browser tests' } },
      { value: same('50'), label: { fr: 'Pages de documentation', en: 'Documentation pages' } },
      { value: same('CI'), label: { fr: 'Lint et tests à chaque push', en: 'Lint and tests on every push' } },
    ],
    result: {
      fr: 'Code source public, documenté et testé, consultable sur GitHub.',
      en: 'Public, documented and tested source code, available on GitHub.',
    },
  },
  {
    slug: 'drymhome',
    number: '08',
    featured: false,
    sector: { fr: 'Immobilier · Projet indépendant', en: 'Real estate · Independent project' },
    title: same('DrymHome'),
    summary: {
      fr: 'Plateforme de location pour locataires et agents : API, notifications temps réel et push, applications Nuxt.',
      en: 'Rental platform for tenants and agents: API, real-time and push notifications, Nuxt apps.',
    },
    role: designDev,
    period: { fr: 'avr. 2026 — aujourd’hui', en: 'Apr 2026 — present' },
    organisation: { fr: 'Projet indépendant', en: 'Independent project' },
    stack: ['Laravel 13', 'Sanctum', 'Reverb', 'Web Push', 'S3', 'Nuxt 4'],
    badges: [
      { tone: 'proof', label: same('970+ tests') },
      { tone: 'proof', label: { fr: 'Temps réel', en: 'Real-time' } },
    ],
    links: [],
    image: { kind: 'none' },
    testCount: 977,
    context: {
      fr: 'Trouver un logement passe souvent par des intermédiaires difficiles à joindre. DrymHome met en relation locataires et agents immobiliers, avec des annonces et des notifications en temps réel.',
      en: 'Finding a home often depends on hard-to-reach intermediaries. DrymHome connects tenants and estate agents with listings and real-time notifications.',
    },
    contribution: [
      {
        fr: 'Conception et développement de l’API Laravel 13 et des applications Nuxt 4 (locataires et agents, back-office).',
        en: 'Designed and built the Laravel 13 API and the Nuxt 4 apps (tenants and agents, back office).',
      },
      {
        fr: 'Authentification par jeton et connexion sociale, notifications temps réel (Reverb) et push web, stockage des médias sur S3.',
        en: 'Token and social sign-in, real-time (Reverb) and web-push notifications, media storage on S3.',
      },
      {
        fr: 'Documentation d’API générée automatiquement depuis le code (Scramble).',
        en: 'API documentation generated automatically from the code (Scramble).',
      },
    ],
    architecture: [
      { label: same('Clients'), description: { fr: 'Deux applications Nuxt 4 : locataires et agents, back-office', en: 'Two Nuxt 4 apps: tenants and agents, back office' } },
      { label: same('API'), description: { fr: 'Laravel 13, Sanctum, Socialite, documentation Scramble', en: 'Laravel 13, Sanctum, Socialite, Scramble docs' } },
      { label: { fr: 'Temps réel', en: 'Real-time' }, description: { fr: 'Laravel Reverb (WebSockets) et Web Push', en: 'Laravel Reverb (WebSockets) and Web Push' } },
      { label: { fr: 'Médias', en: 'Media' }, description: { fr: 'Stockage S3, traitement d’images', en: 'S3 storage, image processing' } },
    ],
    quality: [
      { value: same('970+'), label: { fr: 'Tests Pest', en: 'Pest tests' } },
      { value: same('CI'), label: { fr: 'Tests automatiques à chaque push', en: 'Automated tests on every push' } },
      { value: same('API'), label: { fr: 'Documentation générée depuis le code', en: 'Documentation generated from code' } },
    ],
    result: {
      fr: 'En développement actif : une API largement testée et des applications Nuxt pour chaque profil d’utilisateur.',
      en: 'In active development: a thoroughly tested API and Nuxt apps for each type of user.',
    },
  },
]

export const projectSlugs: string[] = projects.map(p => p.slug)

export function getProject(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug)
}

export function neighbours(slug: string): { prev: string; next: string } {
  const index = projectSlugs.indexOf(slug)
  if (index === -1) throw new Error(`Unknown project: ${slug}`)
  const count = projectSlugs.length
  return { prev: projectSlugs[(index - 1 + count) % count]!, next: projectSlugs[(index + 1) % count]! }
}
```

- [ ] **Step 6: Write `content/other-projects.ts`, `content/method.ts`, `content/experience.ts`, `content/skills.ts`, `content/education.ts`**

`content/other-projects.ts`:
```ts
import type { OtherProject } from './types'

export const otherProjects: OtherProject[] = [
  {
    title: { fr: 'Port Autonome de Douala', en: 'Port of Douala' },
    description: {
      fr: 'Contribution à l’automatisation de la collecte de la redevance TEL, avec la CAMCIS.',
      en: 'Contributed to automating the collection of the TEL port fee, with CAMCIS.',
    },
  },
  {
    title: { fr: 'HAURIZON PAY & SHOP', en: 'HAURIZON PAY & SHOP' },
    description: { fr: 'Plateforme de paiement SaaS et boutique e-commerce (FORAMA).', en: 'SaaS payment platform and e-commerce shop (FORAMA).' },
  },
  {
    title: { fr: 'yt-mp3', en: 'yt-mp3' },
    description: { fr: 'Application Python / Flask conçue pour un proche non-voyant.', en: 'Python / Flask app built for a blind relative.' },
    link: { url: 'https://github.com/kiri1101/yt-mp3' },
  },
  {
    title: { fr: 'Générateur de QR codes', en: 'QR code generator' },
    description: { fr: 'Nuxt 4, 100 % côté client, interface FR/EN.', en: 'Nuxt 4, fully client-side, FR/EN interface.' },
    link: { url: 'https://github.com/kiri1101/qrcode-generator' },
  },
]
```

`content/method.ts`:
```ts
import type { MethodItem } from './types'

export const method: MethodItem[] = [
  {
    icon: 'check',
    title: { fr: 'Tests automatisés', en: 'Automated testing' },
    text: { fr: 'Pest, PHPUnit, Vitest, Playwright : plus de 2 000 tests sur mes projets récents.', en: 'Pest, PHPUnit, Vitest, Playwright: more than 2,000 tests across my recent projects.' },
    short: { fr: 'Plus de 2 000 tests sur mes projets récents.', en: 'More than 2,000 tests across recent projects.' },
  },
  {
    icon: 'refresh',
    title: { fr: 'Intégration continue', en: 'Continuous integration' },
    text: { fr: 'GitHub Actions, Bitbucket Pipelines, Docker : chaque changement vérifié avant la production.', en: 'GitHub Actions, Bitbucket Pipelines, Docker: every change checked before production.' },
    short: { fr: 'Chaque changement vérifié avant la production.', en: 'Every change checked before production.' },
  },
  {
    icon: 'file',
    title: { fr: 'Documentation', en: 'Documentation' },
    text: { fr: 'Guides, ADR, contrats d’API : un code que l’équipe suivante peut reprendre.', en: 'Guides, ADRs, API contracts: code the next team can pick up.' },
    short: { fr: 'Guides, ADR et contrats d’API.', en: 'Guides, ADRs and API contracts.' },
  },
  {
    icon: 'users',
    title: { fr: 'Lead Agile', en: 'Agile leadership' },
    text: { fr: 'Équipes de 3 à 6 développeurs ; Jira, Trello, Notion ; revues de code.', en: 'Teams of 3–6 developers; Jira, Trello, Notion; code reviews.' },
    short: { fr: 'Équipes de 3 à 6 ; Jira, Trello, Notion.', en: 'Teams of 3–6; Jira, Trello, Notion.' },
  },
  {
    icon: 'shield',
    title: { fr: 'Sécurité', en: 'Security' },
    text: { fr: 'Contrôle d’accès par rôles, OTP, documents signés (HMAC), secrets hors du code.', en: 'Role-based access control, OTP, signed documents (HMAC), secrets kept out of code.' },
    short: { fr: 'Rôles, OTP, documents signés (HMAC).', en: 'Roles, OTP, signed documents (HMAC).' },
  },
]
```

`content/experience.ts`:
```ts
import type { ExperienceItem, Localized } from './types'

const fullStack: Localized = { fr: 'Développeur Full Stack', en: 'Full Stack Developer' }

export const experience: ExperienceItem[] = [
  {
    period: { fr: '2023 — aujourd’hui', en: '2023 — present' },
    role: { fr: 'Lead Développeur Full Stack', en: 'Lead Full Stack Developer' },
    company: 'ADWA SARL',
    text: {
      fr: 'Plateformes nationales : e-gouvernement, transport, aviation, finance. Pilotage d’équipes de 3 à 6 développeurs.',
      en: 'National platforms: e-government, transport, aviation, finance. Leading teams of 3–6 developers.',
    },
    current: true,
  },
  {
    period: { fr: '2022 — 2023', en: '2022 — 2023' },
    role: fullStack,
    company: 'VMEDIA CONSULTING',
    text: {
      fr: 'Produits SaaS clients ; intégrations GoHighLevel, Slack, Google Sheets, GoDaddy DNS.',
      en: 'Client SaaS products; GoHighLevel, Slack, Google Sheets and GoDaddy DNS integrations.',
    },
    current: false,
  },
  {
    period: { fr: '2020 — 2022', en: '2020 — 2022' },
    role: fullStack,
    company: 'FORAMA',
    text: { fr: 'HAURIZON SHOP (e-commerce) et HAURIZON PAY (paiement SaaS).', en: 'HAURIZON SHOP (e-commerce) and HAURIZON PAY (SaaS payments).' },
    current: false,
  },
  {
    period: { fr: '2020', en: '2020' },
    role: { fr: 'Stagiaire informatique', en: 'IT intern' },
    company: 'HYDRAC',
    text: { fr: 'Réseau, serveurs et outils internes.', en: 'Network, servers and internal tools.' },
    current: false,
  },
]

export const distinction: Localized = {
  fr: 'Délégué officiel de la CCAA — AFI Aviation Week 2025, Victoria Falls (Zimbabwe)',
  en: 'Official CCAA delegate — AFI Aviation Week 2025, Victoria Falls (Zimbabwe)',
}
```

`content/skills.ts`:
```ts
import type { Localized, SkillTier } from './types'

const same = (text: string): Localized => ({ fr: text, en: text })

export const skillTiers: SkillTier[] = [
  {
    id: 'core',
    title: { fr: 'Cœur de métier', en: 'Core' },
    items: [
      same('Laravel / PHP 8'), same('Vue.js 3 / Nuxt 4'), same('React / Next.js'), same('TypeScript'),
      { fr: 'API RESTful', en: 'RESTful APIs' }, same('MySQL / PostgreSQL'),
      same('Tests (Pest, Vitest, Playwright)'), same('Docker · CI/CD'),
    ],
  },
  {
    id: 'also',
    title: { fr: 'Également pratiqué', en: 'Also practised' },
    items: [
      same('Python (Flask)'), { fr: 'Android avec Quasar', en: 'Android with Quasar' }, same('Tauri · Electron'), same('Redis'),
      same('Tailwind CSS · PrimeVue'), same('Mobile Money · SMS · ERP'),
      { fr: 'Flutter (projets antérieurs)', en: 'Flutter (earlier projects)' },
      { fr: 'MongoDB (projets personnels)', en: 'MongoDB (personal projects)' },
    ],
  },
  {
    id: 'notions',
    title: { fr: 'Notions', en: 'Familiar with' },
    items: [same('Kotlin'), same('Java'), same('Rust'), same('Angular'), same('NestJS')],
  },
]
```

`content/education.ts`:
```ts
import type { EducationItem } from './types'

export const education: EducationItem[] = [
  {
    title: { fr: 'BTech Génie Logiciel', en: 'BTech in Software Engineering' },
    school: { fr: 'IUG Douala · Université de Bamenda', en: 'IUG Douala · University of Bamenda' },
    year: '2026',
    badges: [
      { tone: 'proof', label: { fr: 'GPA 3,27/4', en: 'GPA 3.27/4' } },
      { tone: 'proof', label: { fr: '60/60 crédits', en: '60/60 credits' } },
      { tone: 'plain', label: { fr: 'diplôme en cours de délivrance', en: 'degree being issued' } },
    ],
  },
  {
    title: { fr: 'BTech Génie Électrique & Électronique', en: 'BTech in Electrical & Electronic Engineering' },
    school: { fr: 'DIT Douala — option Télécommunications', en: 'DIT Douala — Telecommunications' },
    year: '2020',
    badges: [],
  },
  {
    title: { fr: 'HND Génie Électrique & Électronique', en: 'HND in Electrical & Electronic Engineering' },
    school: { fr: 'IUC Douala — option Télécommunications', en: 'IUC Douala — Telecommunications' },
    year: '2019',
    badges: [],
  },
]
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: PASS (all content and i18n tests).

- [ ] **Step 8: Commit**

```bash
git add content tests/unit/content.test.ts
git commit -m "feat: add typed bilingual portfolio content with integrity tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Layout shell, SEO head, UI primitives and UI strings

**Files:**
- Create: `app/composables/useLocalized.ts`, `app/layouts/default.vue`, `app/components/layout/{TopBar,LanguageSwitch,OpenBadge,SiteFooter,MobileActionBar}.vue`, `app/components/ui/{AppIcon,Badge,StackPill,SectionHeading}.vue`, `tests/build/helpers.ts`, `tests/build/home.test.ts`
- Modify: `app/app.vue`, `i18n/locales/fr.json`, `i18n/locales/en.json`

**Interfaces:**
- Consumes: `Locale`, `Localized`, `IconName` (Task 2); `profile`, `cvPath` (Task 2).
- Produces: `useLocalized(): <T>(value: Localized<T>) => T`; components `<AppIcon name size? />`, `<Badge tone label />`, `<StackPill label />`, `<SectionHeading number title :aside? :dark? />`; section anchors `projects`, `method`, `career`, `skills`, `contact`; main landmark `#content`; test helpers `OUT`, `SITE`, `page(route)`, `title(html)`, `htmlLang(html)`, `hasLink(html, rel, hrefs, hreflang?)`, `meta(html, key)`, `stripTags(html)`.

- [ ] **Step 1: Write the build-test helpers `tests/build/helpers.ts`**

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const OUT = join(process.cwd(), '.output', 'public')
export const SITE = 'https://jordan-tukum.pages.dev'

export function page(route: string): string {
  const relative = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`
  const file = join(OUT, relative)
  if (!existsSync(file)) throw new Error(`Missing prerendered page: ${relative}`)
  return readFileSync(file, 'utf8')
}

export const title = (html: string): string => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
export const htmlLang = (html: string): string => html.match(/<html[^>]*\blang="([^"]+)"/)?.[1] ?? ''

export function hasLink(html: string, rel: string, hrefs: string[], hreflang?: string): boolean {
  const tags = html.match(/<link\b[^>]*>/g) ?? []
  return tags.some(tag =>
    tag.includes(`rel="${rel}"`)
    && hrefs.some(href => tag.includes(`href="${href}"`))
    && (!hreflang || tag.includes(`hreflang="${hreflang}"`)))
}

export function meta(html: string, key: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/g) ?? []
  const tag = tags.find(t => t.includes(`property="${key}"`) || t.includes(`name="${key}"`))
  return tag?.match(/content="([^"]*)"/)?.[1]
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': '\'', '&#x27;': '\'', '&nbsp;': ' ' }

export const stripTags = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|nbsp|#39|#x27);/g, m => ENTITIES[m] ?? m)
    .replace(/\s+/g, ' ')

export const urlVariants = (path: string): string[] => {
  const base = `${SITE}${path === '/' ? '' : path}`
  return [base, `${base}/`]
}
```

- [ ] **Step 2: Write the failing home shell test `tests/build/home.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { hasLink, htmlLang, meta, page, stripTags, title, urlVariants } from './helpers'

const HOMES = [
  { route: '/', lang: 'fr', nav: ['Projets', 'Méthode', 'Parcours', 'Compétences', 'Contact'], skip: 'Aller au contenu' },
  { route: '/en', lang: 'en', nav: ['Projects', 'Method', 'Career', 'Skills', 'Contact'], skip: 'Skip to content' },
]

describe.each(HOMES)('home $route — shell', ({ route, lang, nav, skip }) => {
  const html = page(route)

  it('declares its language', () => expect(htmlLang(html)).toBe(lang))
  it('has a descriptive title', () => expect(title(html)).toContain('Jordan Tukum Folem'))
  it('has a meta description', () => expect(meta(html, 'description')?.length ?? 0).toBeGreaterThan(80))
  it('has a canonical URL on the reachable host', () => expect(hasLink(html, 'canonical', urlVariants(route))).toBe(true))
  it('links both languages and x-default', () => {
    expect(hasLink(html, 'alternate', urlVariants('/'), 'fr')).toBe(true)
    expect(hasLink(html, 'alternate', urlVariants('/en'), 'en')).toBe(true)
    expect(hasLink(html, 'alternate', urlVariants('/'), 'x-default')).toBe(true)
  })
  it('renders the navigation in its language', () => {
    const text = stripTags(html)
    for (const label of nav) expect(text).toContain(label)
  })
  it('offers a skip link to the main content', () => {
    expect(html).toContain('href="#content"')
    expect(stripTags(html)).toContain(skip)
    expect(html).toMatch(/<main[^>]*id="content"/)
  })
  it('reserves room for the fixed mobile action bar', () => expect(html).toMatch(/pb-24[^"]*lg:pb-0/))
  it('keeps the Google site verification', () => expect(meta(html, 'google-site-verification')).toBe('-o3on4T7CLriyCJbh7NAqGm82V76NJrR7eSZ5Uz_WIM'))
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `npm run generate && npm run test:build`
Expected: FAIL — wrong title / missing canonical / missing nav labels.

- [ ] **Step 4: Write the full UI strings** — replace `i18n/locales/fr.json`

```json
{
  "site": { "name": "Jordan Tukum Folem" },
  "a11y": { "skip": "Aller au contenu" },
  "nav": {
    "home": "Jordan Tukum Folem — accueil",
    "label": "Navigation principale",
    "projects": "Projets",
    "method": "Méthode",
    "career": "Parcours",
    "skills": "Compétences",
    "contact": "Contact",
    "language": "Langue",
    "open": "Ouvrir le menu",
    "close": "Fermer le menu"
  },
  "badge": { "open": "Ouvert aux opportunités" },
  "seo": {
    "homeTitle": "Jordan Tukum Folem — Développeur Full Stack Web & Mobile à Douala",
    "homeDescription": "Développeur full stack (Laravel, Vue.js, React) : plateformes web et mobiles livrées à l’échelle nationale au Cameroun, plus de 2 000 tests automatisés, lead d’équipes de 3 à 6 développeurs.",
    "caseTitle": "{project} — étude de cas · Jordan Tukum Folem",
    "ogAlt": "Jordan Tukum Folem — Développeur Full Stack Web & Mobile"
  },
  "hero": {
    "eyebrow": "Développeur Full Stack Web & Mobile — Douala",
    "ctaProjects": "Voir les projets",
    "ctaCv": "Télécharger mon CV",
    "profileTitle": "Fiche profil",
    "figure": "Fig. 01"
  },
  "proof": { "label": "Chiffres clés" },
  "trust": { "label": "Plateformes livrées pour" },
  "projects": {
    "title": "Projets sélectionnés",
    "count": "8 études de cas",
    "role": "Mon rôle",
    "readCase": "Lire l’étude de cas",
    "caseShort": "Étude de cas",
    "privateCode": "Code privé — démonstration sur demande",
    "kioskFigure": "Fig. 02 — Borne multiservices"
  },
  "kiosk": {
    "printer": "Imprimante thermique",
    "qr": "Lecteur QR",
    "id": "Scanner d’identité",
    "screen": "Écran tactile · Nuxt 4"
  },
  "method": {
    "title": "Ma méthode",
    "intro": "Ce que vous retrouverez dans mon code — et que vous pouvez vérifier dans mes dépôts publics."
  },
  "career": { "title": "Parcours", "distinction": "Distinction" },
  "skills": { "title": "Compétences" },
  "other": { "title": "Autres réalisations", "code": "Code public" },
  "education": { "title": "Formation" },
  "contact": {
    "eyebrow": "Contact",
    "title": "Un poste, un projet ?",
    "titleAccent": "Parlons-en.",
    "text": "En français ou en anglais, par e-mail ou sur WhatsApp.",
    "email": "Écrire un e-mail",
    "whatsapp": "WhatsApp",
    "cv": "Télécharger mon CV",
    "cvShort": "Mon CV"
  },
  "footer": { "builtWith": "Site réalisé avec Nuxt 4", "source": "code source" },
  "case": {
    "back": "Tous les projets",
    "eyebrow": "Étude de cas {number} / 08",
    "factsTitle": "Fiche projet",
    "role": "Rôle",
    "period": "Période",
    "organisation": "Cadre",
    "stack": "Stack",
    "links": "Liens",
    "toc": "Sommaire",
    "context": "Contexte",
    "contribution": "Ma contribution",
    "architecture": "Architecture",
    "architectureFigure": "Fig. 02 — Couches de l’application",
    "keyDecision": "Décision clé",
    "quality": "Qualité & preuves",
    "result": "Résultat",
    "prev": "Projet précédent",
    "next": "Projet suivant",
    "ctaTitle": "Ce type de plateforme vous intéresse ?",
    "ctaContact": "Me contacter"
  }
}
```

Replace `i18n/locales/en.json`:
```json
{
  "site": { "name": "Jordan Tukum Folem" },
  "a11y": { "skip": "Skip to content" },
  "nav": {
    "home": "Jordan Tukum Folem — home",
    "label": "Main navigation",
    "projects": "Projects",
    "method": "Method",
    "career": "Career",
    "skills": "Skills",
    "contact": "Contact",
    "language": "Language",
    "open": "Open menu",
    "close": "Close menu"
  },
  "badge": { "open": "Open to opportunities" },
  "seo": {
    "homeTitle": "Jordan Tukum Folem — Full Stack Web & Mobile Developer in Douala",
    "homeDescription": "Full stack developer (Laravel, Vue.js, React): web and mobile platforms shipped at national scale in Cameroon, 2,000+ automated tests, leading teams of 3–6 developers.",
    "caseTitle": "{project} — case study · Jordan Tukum Folem",
    "ogAlt": "Jordan Tukum Folem — Full Stack Web & Mobile Developer"
  },
  "hero": {
    "eyebrow": "Full Stack Web & Mobile Developer — Douala",
    "ctaProjects": "View projects",
    "ctaCv": "Download my CV",
    "profileTitle": "Profile",
    "figure": "Fig. 01"
  },
  "proof": { "label": "Key figures" },
  "trust": { "label": "Platforms delivered for" },
  "projects": {
    "title": "Selected work",
    "count": "8 case studies",
    "role": "My role",
    "readCase": "Read the case study",
    "caseShort": "Case study",
    "privateCode": "Private code — walkthrough on request",
    "kioskFigure": "Fig. 02 — Multi-service kiosk"
  },
  "kiosk": {
    "printer": "Thermal printer",
    "qr": "QR reader",
    "id": "ID scanner",
    "screen": "Touch screen · Nuxt 4"
  },
  "method": {
    "title": "How I work",
    "intro": "What you will find in my code — and can check in my public repositories."
  },
  "career": { "title": "Career", "distinction": "Distinction" },
  "skills": { "title": "Skills" },
  "other": { "title": "Other work", "code": "Public code" },
  "education": { "title": "Education" },
  "contact": {
    "eyebrow": "Contact",
    "title": "A role, a project?",
    "titleAccent": "Let’s talk.",
    "text": "In French or English, by email or on WhatsApp.",
    "email": "Send an email",
    "whatsapp": "WhatsApp",
    "cv": "Download my CV",
    "cvShort": "My CV"
  },
  "footer": { "builtWith": "Built with Nuxt 4", "source": "source code" },
  "case": {
    "back": "All projects",
    "eyebrow": "Case study {number} / 08",
    "factsTitle": "Project sheet",
    "role": "Role",
    "period": "Period",
    "organisation": "Organisation",
    "stack": "Stack",
    "links": "Links",
    "toc": "Contents",
    "context": "Context",
    "contribution": "My contribution",
    "architecture": "Architecture",
    "architectureFigure": "Fig. 02 — Application layers",
    "keyDecision": "Key decision",
    "quality": "Quality & evidence",
    "result": "Outcome",
    "prev": "Previous project",
    "next": "Next project",
    "ctaTitle": "Interested in this kind of platform?",
    "ctaContact": "Contact me"
  }
}
```

- [ ] **Step 5: Write `app/composables/useLocalized.ts`**

```ts
import type { Locale, Localized } from '~~/content/types'

export function useLocalized() {
  const { locale } = useI18n()
  return <T>(value: Localized<T>): T => value[locale.value as Locale]
}
```

- [ ] **Step 6: Write the UI primitives**

`app/components/ui/AppIcon.vue` (Feather icon paths, MIT):
```vue
<script setup lang="ts">
import type { IconName } from '~~/content/types'

type Shape = { tag: 'path' | 'polyline' | 'line' | 'circle'; attrs: Record<string, string> }
const p = (d: string): Shape => ({ tag: 'path', attrs: { d } })
const pl = (points: string): Shape => ({ tag: 'polyline', attrs: { points } })
const ln = (x1: number, y1: number, x2: number, y2: number): Shape =>
  ({ tag: 'line', attrs: { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2) } })

const ICONS: Record<IconName, Shape[]> = {
  'check': [pl('9 11 12 14 22 4'), p('M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11')],
  'refresh': [pl('23 4 23 10 17 10'), pl('1 20 1 14 7 14'), p('M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15')],
  'file': [p('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), pl('14 2 14 8 20 8'), ln(16, 13, 8, 13), ln(16, 17, 8, 17)],
  'users': [p('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'), { tag: 'circle', attrs: { cx: '9', cy: '7', r: '4' } }, p('M23 21v-2a4 4 0 0 0-3-3.87'), p('M16 3.13a4 4 0 0 1 0 7.75')],
  'shield': [p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')],
  'download': [p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), pl('7 10 12 15 17 10'), ln(12, 15, 12, 3)],
  'mail': [p('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'), pl('22,6 12,13 2,6')],
  'chat': [p('M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z')],
  'menu': [ln(3, 6, 21, 6), ln(3, 12, 21, 12), ln(3, 18, 21, 18)],
  'close': [ln(18, 6, 6, 18), ln(6, 6, 18, 18)],
  'arrow-up-right': [ln(7, 17, 17, 7), pl('7 7 17 7 17 17')],
}

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 })
const shapes = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"
  >
    <component :is="shape.tag" v-for="(shape, i) in shapes" :key="i" v-bind="shape.attrs" />
  </svg>
</template>
```

`app/components/ui/Badge.vue`:
```vue
<script setup lang="ts">
import type { BadgeTone } from '~~/content/types'
defineProps<{ tone: BadgeTone; label: string }>()
</script>

<template>
  <span
    v-if="tone === 'live'"
    class="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 font-mono text-xs text-white"
  >
    <span class="inline-block size-1.5 rounded-full bg-signal" aria-hidden="true" />{{ label }}
  </span>
  <span v-else-if="tone === 'proof'" class="inline-flex rounded-full bg-accent-soft px-2.5 py-1 font-mono text-xs font-bold text-accent">
    {{ label }}
  </span>
  <span v-else class="inline-flex rounded-full border border-line px-2.5 py-1 font-mono text-xs text-body">{{ label }}</span>
</template>
```

`app/components/ui/StackPill.vue`:
```vue
<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <span class="rounded-md border border-line px-2 py-1 font-mono text-xs text-body">{{ label }}</span>
</template>
```

`app/components/ui/SectionHeading.vue`:
```vue
<script setup lang="ts">
withDefaults(defineProps<{ number: string; title: string; aside?: string; dark?: boolean; level?: 'h2' | 'h3' }>(), {
  aside: undefined, dark: false, level: 'h2',
})
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-4">
      <span class="font-mono text-[13px] font-bold" :class="dark ? 'text-sky' : 'text-accent'">{{ number }}</span>
      <span class="h-px flex-1" :class="dark ? 'bg-white/15' : 'bg-line'" aria-hidden="true" />
      <span v-if="aside" class="font-mono text-[13px] uppercase" :class="dark ? 'text-mist' : 'text-muted'">{{ aside }}</span>
    </div>
    <component :is="level" class="text-[2rem] font-extrabold tracking-[-0.03em] md:text-[2.75rem]" :class="dark ? 'text-white' : 'text-ink'">
      {{ title }}
    </component>
  </div>
</template>
```

- [ ] **Step 7: Write the layout components**

`app/components/layout/OpenBadge.vue`:
```vue
<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <span class="items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-xs text-ink">
    <span class="inline-block size-2 rounded-full bg-signal shadow-[0_0_0_3px_rgb(227_163_43/0.25)]" aria-hidden="true" />
    {{ t('badge.open') }}
  </span>
</template>
```

`app/components/layout/LanguageSwitch.vue`:
```vue
<script setup lang="ts">
import type { Locale } from '~~/content/types'

const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const items = computed(() =>
  locales.value.map((l) => {
    const code = (typeof l === 'string' ? l : l.code) as Locale
    const name = typeof l === 'string' ? l : (l.name ?? code)
    return { code, name, to: switchLocalePath(code), active: code === locale.value }
  }))
</script>

<template>
  <div role="group" :aria-label="t('nav.language')" class="inline-flex rounded-lg bg-tint p-[3px] font-mono text-[13px] font-bold">
    <NuxtLink
      v-for="item in items" :key="item.code" :to="item.to" :hreflang="item.code" :aria-label="item.name"
      :aria-current="item.active ? 'true' : undefined"
      class="grid min-h-11 min-w-11 place-items-center rounded-md px-3 no-underline"
      :class="item.active ? 'bg-ink text-white hover:text-white' : 'text-ink hover:bg-white hover:text-ink'"
    >
      {{ item.code.toUpperCase() }}
    </NuxtLink>
  </div>
</template>
```

`app/components/layout/TopBar.vue`:
```vue
<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const open = ref(false)
const sections = ['projects', 'method', 'career', 'skills', 'contact'] as const
const home = computed(() => localePath('/'))
const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-5 md:h-[72px] md:gap-8 md:px-8">
      <NuxtLink :to="home" :aria-label="t('nav.home')" class="rounded bg-ink px-2.5 py-1.5 font-mono text-[15px] font-bold tracking-[1.5px] text-white no-underline hover:text-white">
        JTF
      </NuxtLink>
      <nav :aria-label="t('nav.label')" class="hidden flex-1 justify-center gap-8 text-sm font-semibold lg:flex">
        <NuxtLink v-for="s in sections" :key="s" :to="`${home}#${s}`" class="text-ink no-underline hover:text-accent">
          {{ t(`nav.${s}`) }}
        </NuxtLink>
      </nav>
      <span class="flex-1 lg:hidden" />
      <OpenBadge class="hidden md:inline-flex" />
      <LanguageSwitch />
      <button
        type="button" class="grid size-11 place-items-center rounded-lg border border-line bg-surface text-ink lg:hidden"
        :aria-expanded="open" aria-controls="mobile-menu" :aria-label="open ? t('nav.close') : t('nav.open')"
        @click="open = !open"
      >
        <AppIcon :name="open ? 'close' : 'menu'" />
      </button>
    </div>
    <nav v-show="open" id="mobile-menu" :aria-label="t('nav.label')" class="border-t border-line bg-white px-5 py-2 lg:hidden">
      <NuxtLink
        v-for="s in sections" :key="s" :to="`${home}#${s}`"
        class="block border-b border-grid py-3 font-semibold text-ink no-underline last:border-0" @click="open = false"
      >
        {{ t(`nav.${s}`) }}
      </NuxtLink>
    </nav>
  </header>
</template>
```

`app/components/layout/SiteFooter.vue`:
```vue
<script setup lang="ts">
import { profile } from '~~/content/profile'
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <footer class="bg-night">
    <div class="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 px-5 py-6 font-mono text-xs text-mist md:px-8">
      <span>© 2026 {{ profile.name }} — {{ l(profile.location) }}</span>
      <span>{{ t('footer.builtWith') }} · <a :href="profile.repoUrl" class="text-sky hover:text-white" target="_blank" rel="noopener">{{ t('footer.source') }} ↗</a></span>
    </div>
  </footer>
</template>
```

`app/components/layout/MobileActionBar.vue`:
```vue
<script setup lang="ts">
import type { Locale } from '~~/content/types'
import { cvPath, profile } from '~~/content/profile'
const { t, locale } = useI18n()
</script>

<template>
  <div class="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgb(19_32_58/0.08)] backdrop-blur lg:hidden">
    <a :href="profile.whatsappUrl" target="_blank" rel="noopener" class="btn-primary min-h-[50px] flex-1 px-4 text-[15px]">
      <AppIcon name="chat" :size="17" />{{ t('contact.whatsapp') }}
    </a>
    <a :href="cvPath(locale as Locale)" download class="btn-secondary min-h-[50px] flex-1 px-4 text-[15px]">
      <AppIcon name="download" :size="17" />{{ t('contact.cvShort') }}
    </a>
  </div>
</template>
```

- [ ] **Step 8: Write `app/layouts/default.vue` and the SEO-aware `app/app.vue`**

`app/layouts/default.vue`:
```vue
<template>
  <div class="flex min-h-screen flex-col bg-paper pb-24 text-ink lg:pb-0">
    <TopBar />
    <main id="content" class="flex-1" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
    <MobileActionBar />
  </div>
</template>
```

`app/app.vue`:
```vue
<script setup lang="ts">
const { t } = useI18n()
const head = useLocaleHead({ seo: true })
useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs?.lang },
  link: [...(head.value.link ?? [])],
  meta: [...(head.value.meta ?? [])],
}))
</script>

<template>
  <a href="#content" class="skip-link">{{ t('a11y.skip') }}</a>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```
If `nuxi typecheck` rejects the `seo` option, open `node_modules/@nuxtjs/i18n/dist/runtime/composables/index.d.ts`, find the `useLocaleHead` options type and use the field that enables canonical + hreflang output; the build test in Step 2 is the arbiter.

- [ ] **Step 9: Give the temporary home page its SEO meta** — replace `app/pages/index.vue` (Task 4 fills the body)

```vue
<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
})
</script>

<template>
  <section id="projects" class="mx-auto max-w-[1240px] px-5 py-16 md:px-8">
    <h1 class="text-5xl font-extrabold">{{ t('site.name') }}</h1>
  </section>
</template>
```

- [ ] **Step 10: Run unit and build tests**

Run: `npm test && npm run generate && npm run test:build`
Expected: PASS (i18n parity now covers ~90 keys; home shell tests pass for `/` and `/en`).

- [ ] **Step 11: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 12: Commit**

```bash
git add app i18n tests/build
git commit -m "feat: add layout shell with locale-aware SEO head, navigation and UI primitives

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Home page sections and screenshots

**Files:**
- Create: `app/components/home/{HeroSection,ProfileCard,ProofStrip,TrustRow,ProjectGrid,ProjectCard,MethodSection,CareerTimeline,SkillTiers,OtherProjects,EducationList,ContactBand}.vue`, `app/components/ui/{BrowserFrame,KioskSchematic}.vue`, `public/img/services-publics.webp`, `public/img/equip4safety.webp`
- Modify: `app/pages/index.vue`, `tests/build/home.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–3.
- Produces: `<BrowserFrame :src :alt :url-label :position? :height? :compact? :caption? />`, `<KioskSchematic :compact? />`, `<ProjectCard :project :featured? />` (reused nowhere else, but Task 5's tests rely on the case-study link `href="/projets/<slug>"` / `"/en/projects/<slug>"` it renders).

- [ ] **Step 1: Extend `tests/build/home.test.ts` with content assertions (failing)**

Append:
```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { projects } from '../../content/projects'
import { profile } from '../../content/profile'
import { OUT } from './helpers'

describe.each([
  { route: '/', lang: 'fr' as const, tests: '2 000+', caseBase: '/projets/' },
  { route: '/en', lang: 'en' as const, tests: '2,000+', caseBase: '/en/projects/' },
])('home $route — content', ({ route, lang, tests, caseBase }) => {
  const html = page(route)
  const text = stripTags(html)

  it('shows every case study with a link to it', () => {
    for (const p of projects) {
      expect(text).toContain(p.title[lang])
      expect(html).toContain(`href="${caseBase}${p.slug}"`)
    }
  })
  it('shows the proof strip', () => {
    expect(text).toContain(tests)
    for (const s of profile.stats) expect(text).toContain(s.label[lang])
  })
  it('links WhatsApp, email, LinkedIn and GitHub', () => {
    for (const url of [profile.whatsappUrl, `mailto:${profile.email}`, profile.linkedinUrl, profile.githubUrl]) {
      expect(html).toContain(`href="${url}"`)
    }
  })
  it('names the institutions delivered for', () => {
    for (const i of profile.deliveredFor) expect(text).toContain(i[lang])
  })
  it('references screenshots that exist', () => {
    const sources = [...html.matchAll(/<img[^>]+src="(\/img\/[^"]+)"/g)].map(m => m[1]!)
    expect(sources.length).toBeGreaterThanOrEqual(2)
    for (const src of sources) expect(existsSync(join(OUT, src))).toBe(true)
  })
  it('has exactly one h1', () => expect(html.match(/<h1\b/g)).toHaveLength(1))
  it('contains no placeholders', () => expect(text).not.toMatch(/\[À COMPLÉTER|TODO|lorem/i))
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npm run generate && npm run test:build`
Expected: FAIL — project titles and stats missing.

- [ ] **Step 3: Convert the screenshots to WebP**

The captures are in the canvas artifact (`project/img/services-publics.jpg`, `project/img/equip4safety.jpg`). If the session scratchpad no longer has them, fetch them with the Artifact tool (`action: "read"`, `url: "https://claude.ai/artifact/NVc7k2AZgsXP6MQTg6kHaX"`, `paths: ["project/img/services-publics.jpg", "project/img/equip4safety.jpg"]`). Then run (adjust `SRC` to where the JPGs are):
```bash
SRC="<folder containing the two jpg files>"
mkdir -p public/img
python - "$SRC" <<'EOF'
import sys
from pathlib import Path
from PIL import Image
src = Path(sys.argv[1])
for name in ("services-publics", "equip4safety"):
    img = Image.open(src / f"{name}.jpg").convert("RGB")
    img.save(f"public/img/{name}.webp", "WEBP", quality=80, method=6)
    print(name, img.size)
EOF
ls -la public/img
```
Expected: two `.webp` files, each 1440 × 900 and under 150 KB.

- [ ] **Step 4: Write `app/components/ui/BrowserFrame.vue` and `app/components/ui/KioskSchematic.vue`**

`BrowserFrame.vue`:
```vue
<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  alt: string
  urlLabel: string
  position?: string
  height?: string
  compact?: boolean
  caption?: string
  eager?: boolean
}>(), { position: 'top', height: undefined, compact: false, caption: undefined, eager: false })
</script>

<template>
  <figure class="m-0 overflow-hidden rounded-t-[10px] bg-surface shadow-[0_-1px_0_var(--color-line),0_8px_24px_rgb(19_32_58/0.10)]" :class="caption ? 'rounded-b-[14px] border border-line' : ''">
    <div class="flex items-center gap-1.5 border-b border-grid bg-paper px-3" :class="compact ? 'h-[22px]' : 'h-[30px]'">
      <span v-for="i in 3" :key="i" class="inline-block rounded-full bg-line" :class="compact ? 'size-[7px]' : 'size-[9px]'" aria-hidden="true" />
      <span v-if="!compact" class="ml-3 truncate font-mono text-[11px] text-muted">{{ urlLabel }}</span>
    </div>
    <img
      :src="src" :alt="alt" width="1440" height="900" :loading="eager ? 'eager' : 'lazy'" decoding="async"
      class="block w-full object-cover" :style="{ objectPosition: position, height: height ?? 'auto' }"
    >
    <figcaption v-if="caption" class="border-t border-grid px-5 py-3 font-mono text-xs text-muted">{{ caption }}</figcaption>
  </figure>
</template>
```

`KioskSchematic.vue`:
```vue
<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const { t } = useI18n()
</script>

<template>
  <figure class="blueprint-dark relative m-0 overflow-hidden bg-ink" :class="compact ? 'h-[190px]' : 'h-[300px]'">
    <figcaption class="absolute left-5 top-4 font-mono uppercase tracking-[1.2px] text-sky" :class="compact ? 'text-[10px]' : 'text-[11px]'">
      {{ t('projects.kioskFigure') }}
    </figcaption>
    <div class="absolute left-1/2 top-[17%] h-[72%] w-[22%] max-w-[120px] -translate-x-1/2 rounded-[14px] border-2 border-sky" aria-hidden="true">
      <div class="mx-auto mt-[12%] h-[30%] w-[76%] rounded border-[1.5px] border-sky bg-sky/10" />
      <div class="mx-auto mt-[12%] h-[5%] w-[34%] rounded-sm border-[1.5px] border-sky" />
      <div class="mx-auto mt-[8%] aspect-square w-[22%] rounded-sm border-[1.5px] border-sky" />
      <div class="mx-auto mt-[10%] h-[6%] w-1/2 rounded-sm border-[1.5px] border-sky" />
    </div>
    <ul class="m-0 list-none p-0 font-mono uppercase text-white" :class="compact ? 'text-[9px]' : 'text-[11px]'">
      <li class="absolute left-5 right-[calc(50%+min(11%,60px))] top-[54%] flex items-center gap-2">
        <span>{{ t('kiosk.printer') }}</span><span class="h-px flex-1 bg-sky" aria-hidden="true" />
      </li>
      <li class="absolute left-5 right-[calc(50%+min(11%,60px))] top-[78%] flex items-center gap-2">
        <span>{{ t('kiosk.id') }}</span><span class="h-px flex-1 bg-sky" aria-hidden="true" />
      </li>
      <li class="absolute left-[calc(50%+min(11%,60px))] right-5 top-[32%] flex items-center gap-2">
        <span class="h-px flex-1 bg-sky" aria-hidden="true" /><span>{{ t('kiosk.screen') }}</span>
      </li>
      <li class="absolute left-[calc(50%+min(11%,60px))] right-5 top-[64%] flex items-center gap-2">
        <span class="h-px flex-1 bg-sky" aria-hidden="true" /><span>{{ t('kiosk.qr') }}</span>
      </li>
    </ul>
  </figure>
</template>
```

- [ ] **Step 5: Write `HeroSection.vue`, `ProfileCard.vue`, `ProofStrip.vue`, `TrustRow.vue`** (all in `app/components/home/`)

`ProfileCard.vue`:
```vue
<script setup lang="ts">
import type { Profile } from '~~/content/types'
defineProps<{ profile: Profile }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <aside :aria-label="t('hero.profileTitle')" class="overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgb(19_32_58/0.06),0_16px_40px_rgb(19_32_58/0.08)]">
    <div class="flex items-center justify-between bg-ink px-6 py-4 font-mono text-xs uppercase tracking-[1.5px] text-white">
      <span>{{ t('hero.profileTitle') }}</span><span class="text-sky">{{ t('hero.figure') }}</span>
    </div>
    <dl class="m-0 px-6 py-2">
      <div v-for="(fact, i) in profile.facts" :key="i" class="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid py-4 last:border-0">
        <dt class="w-[140px] shrink-0 pt-0.5 font-mono text-xs uppercase text-muted">{{ l(fact.label) }}</dt>
        <dd class="m-0 min-w-[180px] flex-1 text-[15px] font-semibold">{{ l(fact.value) }}</dd>
      </div>
    </dl>
    <div class="flex flex-wrap gap-6 border-t border-grid bg-paper px-6 py-4 text-sm font-bold">
      <a :href="profile.linkedinUrl" target="_blank" rel="noopener" class="no-underline">LinkedIn ↗</a>
      <a :href="profile.githubUrl" target="_blank" rel="noopener" class="no-underline">GitHub ↗</a>
    </div>
  </aside>
</template>
```

`HeroSection.vue`:
```vue
<script setup lang="ts">
import type { Locale, Profile } from '~~/content/types'
import { cvPath } from '~~/content/profile'
const props = defineProps<{ profile: Profile }>()
const { t, locale } = useI18n()
const l = useLocalized()
const localePath = useLocalePath()
const [first, ...rest] = props.profile.name.split(' ')
</script>

<template>
  <section class="blueprint border-b border-line bg-paper">
    <div class="mx-auto flex max-w-[1240px] flex-wrap items-center gap-14 px-5 pb-16 pt-12 md:px-8 md:pb-20 md:pt-24">
      <div class="min-w-0 flex-[7_1_540px]">
        <p class="mb-7 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[1.5px] text-accent md:text-[13px]">
          <span class="inline-block h-0.5 w-7 bg-accent" aria-hidden="true" />{{ t('hero.eyebrow') }}
        </p>
        <h1 class="mb-8 text-[3rem] font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-[4.5rem] lg:text-[6rem]">
          {{ first }}<br>{{ rest.join(' ') }}<span class="text-accent">.</span>
        </h1>
        <p class="mb-10 max-w-[640px] text-[17px] leading-relaxed text-body md:text-[21px]">{{ l(profile.valueProp) }}</p>
        <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <NuxtLink :to="`${localePath('/')}#projects`" class="btn-primary">{{ t('hero.ctaProjects') }} <span aria-hidden="true">→</span></NuxtLink>
          <a :href="cvPath(locale as Locale)" download class="btn-secondary"><AppIcon name="download" :size="18" />{{ t('hero.ctaCv') }}</a>
        </div>
        <div class="flex flex-wrap gap-x-7 gap-y-3 font-mono text-sm text-body">
          <a :href="`mailto:${profile.email}`" class="inline-flex items-center gap-2 text-body no-underline hover:text-accent">
            <AppIcon name="mail" :size="16" class="text-accent" />{{ profile.email }}
          </a>
          <a :href="profile.whatsappUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-body no-underline hover:text-accent">
            <AppIcon name="chat" :size="16" class="text-accent" />WhatsApp {{ profile.phone }}
          </a>
        </div>
      </div>
      <ProfileCard :profile="profile" class="min-w-0 flex-[5_1_340px]" />
    </div>
  </section>
</template>
```

`ProofStrip.vue`:
```vue
<script setup lang="ts">
import type { Stat } from '~~/content/types'
defineProps<{ stats: Stat[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <section :aria-label="t('proof.label')" class="border-b border-line bg-surface">
    <dl class="mx-auto m-0 grid max-w-[1240px] grid-cols-2 px-5 md:px-8 lg:grid-cols-4">
      <div
        v-for="(stat, i) in stats" :key="i"
        class="flex flex-col-reverse justify-end border-grid py-7 md:py-9"
        :class="[i % 2 === 1 ? 'border-l pl-5 md:pl-7' : 'pr-5 md:pr-7', i >= 2 ? 'border-t lg:border-t-0' : '', i === 2 ? 'lg:border-l lg:pl-7' : '']"
      >
        <dt class="mt-3 font-mono text-[10px] uppercase tracking-[1.2px] text-accent md:text-xs">
          {{ l(stat.label) }}<span class="mt-1 block font-sans text-sm normal-case tracking-normal text-muted">{{ l(stat.caption) }}</span>
        </dt>
        <dd class="m-0 text-[2.4rem] font-extrabold leading-none tracking-[-0.03em] text-ink md:text-[3.5rem]">{{ l(stat.value) }}</dd>
      </div>
    </dl>
  </section>
</template>
```

`TrustRow.vue`:
```vue
<script setup lang="ts">
import type { Localized } from '~~/content/types'
defineProps<{ items: Localized[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <section :aria-label="t('trust.label')" class="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-9 md:px-8">
    <span class="font-mono text-xs uppercase tracking-[1.5px] text-muted">{{ t('trust.label') }}</span>
    <ul class="m-0 flex list-none flex-wrap items-center gap-x-7 gap-y-3 p-0 text-[15px] font-bold text-body md:text-base">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-7">
        <span v-if="i > 0" class="inline-block size-[5px] bg-accent" aria-hidden="true" />{{ l(item) }}
      </li>
    </ul>
  </section>
</template>
```

- [ ] **Step 6: Write `ProjectCard.vue` and `ProjectGrid.vue`**

`ProjectCard.vue`:
```vue
<script setup lang="ts">
import type { Project } from '~~/content/types'
const props = withDefaults(defineProps<{ project: Project; featured?: boolean }>(), { featured: false })
const { t, locale } = useI18n()
const l = useLocalized()
const localePath = useLocalePath()
const caseLink = computed(() => localePath({ name: 'projets-slug', params: { slug: props.project.slug } }))
const externalLink = computed(() => props.project.links.find(link => link.kind !== 'code'))
const colon = computed(() => (locale.value === 'fr' ? ' :' : ':'))
</script>

<template>
  <article
    class="flex min-w-0 flex-col overflow-hidden border border-line bg-surface"
    :class="featured ? 'rounded-2xl shadow-[0_1px_2px_rgb(19_32_58/0.05),0_12px_32px_rgb(19_32_58/0.06)]' : 'rounded-[14px]'"
  >
    <template v-if="featured">
      <div v-if="project.image.kind === 'screenshot'" class="bg-tint px-4 pt-4 md:px-5 md:pt-5">
        <BrowserFrame
          :src="project.image.src" :alt="l(project.image.alt)" :url-label="project.links[0]?.label ?? ''"
          :position="project.image.position" height="250px" eager
        />
      </div>
      <KioskSchematic v-else-if="project.image.kind === 'kiosk'" />
    </template>
    <img
      v-else-if="project.image.kind === 'screenshot'" :src="project.image.src" :alt="l(project.image.alt)"
      width="1440" height="900" loading="lazy" decoding="async"
      class="block h-[150px] w-full border-b border-line object-cover" :style="{ objectPosition: project.image.position }"
    >
    <div class="flex flex-1 flex-col gap-3.5" :class="featured ? 'p-6 md:px-8 md:pb-8 md:pt-7' : 'p-6 md:p-7'">
      <div class="flex flex-wrap items-center gap-2">
        <span class="flex-1 font-mono text-[11px] uppercase tracking-[1.2px] text-accent md:text-xs">{{ l(project.sector) }}</span>
        <span v-if="!featured" class="font-mono text-[11px] text-muted">№ {{ project.number }}</span>
      </div>
      <div v-if="featured" class="flex flex-wrap gap-2">
        <Badge v-for="(badge, i) in project.badges" :key="i" :tone="badge.tone" :label="l(badge.label)" />
      </div>
      <h3 class="m-0 font-extrabold tracking-[-0.02em]" :class="featured ? 'text-[1.6rem] md:text-[1.9rem]' : 'text-[1.35rem]'">{{ l(project.title) }}</h3>
      <p class="m-0 leading-relaxed text-body" :class="featured ? 'text-base' : 'text-[15px]'">{{ l(project.summary) }}</p>
      <div v-if="!featured" class="flex flex-wrap gap-2">
        <Badge v-for="(badge, i) in project.badges" :key="i" :tone="badge.tone" :label="l(badge.label)" />
      </div>
      <template v-if="featured">
        <p class="m-0 text-sm text-body"><strong class="text-ink">{{ t('projects.role') }}{{ colon }}</strong> {{ l(project.role).toLowerCase() }}</p>
        <div class="flex flex-wrap gap-2">
          <StackPill v-for="tech in project.stack" :key="tech" :label="tech" />
        </div>
      </template>
      <p v-else class="m-0 font-mono text-xs text-muted">{{ l(project.role) }} · {{ project.stack.slice(0, 3).join(' · ') }}</p>
      <div class="mt-auto flex flex-wrap gap-x-7 gap-y-2 pt-2 text-[15px] font-bold">
        <NuxtLink :to="caseLink" class="no-underline">{{ featured ? t('projects.readCase') : t('projects.caseShort') }} →</NuxtLink>
        <a v-if="featured && externalLink" :href="externalLink.url" target="_blank" rel="noopener" class="text-body no-underline">{{ externalLink.label }} ↗</a>
      </div>
    </div>
  </article>
</template>
```

`ProjectGrid.vue`:
```vue
<script setup lang="ts">
import type { Project } from '~~/content/types'
const props = defineProps<{ projects: Project[] }>()
const { t } = useI18n()
const featured = computed(() => props.projects.filter(p => p.featured))
const others = computed(() => props.projects.filter(p => !p.featured))
</script>

<template>
  <section id="projects" class="mx-auto max-w-[1240px] px-5 pb-12 pt-16 md:px-8">
    <SectionHeading number="01" :title="t('projects.title')" :aside="t('projects.count')" />
    <div class="mb-7 mt-10 grid gap-7 lg:grid-cols-2">
      <ProjectCard v-for="p in featured" :key="p.slug" :project="p" featured />
    </div>
    <div class="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
      <ProjectCard v-for="p in others" :key="p.slug" :project="p" />
    </div>
  </section>
</template>
```

- [ ] **Step 7: Write `MethodSection.vue`, `CareerTimeline.vue`, `SkillTiers.vue`**

`MethodSection.vue`:
```vue
<script setup lang="ts">
import type { MethodItem } from '~~/content/types'
defineProps<{ items: MethodItem[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <section id="method" class="mt-8 border-y border-line bg-tint">
    <div class="mx-auto max-w-[1240px] px-5 py-16 md:px-8 md:py-20">
      <SectionHeading number="02" :title="t('method.title')" />
      <p class="mb-11 mt-3 max-w-[720px] text-lg leading-relaxed text-body">{{ t('method.intro') }}</p>
      <ul class="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-5">
        <li v-for="(item, i) in items" :key="i" class="flex gap-4 rounded-[14px] border border-line bg-surface p-5 lg:flex-col lg:px-6 lg:py-7">
          <span class="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent lg:size-11"><AppIcon :name="item.icon" :size="21" /></span>
          <div>
            <h3 class="mb-2 text-[17px] font-bold">{{ l(item.title) }}</h3>
            <p class="m-0 text-sm leading-relaxed text-body">
              <span class="lg:hidden">{{ l(item.short) }}</span><span class="hidden lg:inline">{{ l(item.text) }}</span>
            </p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
```

`CareerTimeline.vue`:
```vue
<script setup lang="ts">
import type { ExperienceItem, Localized } from '~~/content/types'
defineProps<{ items: ExperienceItem[]; distinction: Localized }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <div id="career" class="min-w-0">
    <SectionHeading number="03" :title="t('career.title')" />
    <ol class="m-0 mt-9 list-none p-0">
      <li v-for="(item, i) in items" :key="i" class="flex gap-5" :class="i < items.length - 1 ? 'pb-7' : ''">
        <div class="flex w-3.5 shrink-0 flex-col items-center" aria-hidden="true">
          <span class="mt-1 block size-3.5 rounded-full" :class="item.current ? 'bg-accent shadow-[0_0_0_4px_var(--color-accent-soft)]' : 'border-2 border-accent bg-surface'" />
          <span v-if="i < items.length - 1" class="mt-2 w-0.5 flex-1 bg-line" />
        </div>
        <div>
          <p class="mb-1.5 font-mono text-xs uppercase tracking-[1px] text-accent">{{ l(item.period) }}</p>
          <h3 class="text-[19px] font-bold">{{ l(item.role) }} · {{ item.company }}</h3>
          <p class="mt-1.5 text-[15px] leading-relaxed text-body">{{ l(item.text) }}</p>
        </div>
      </li>
    </ol>
    <div class="mt-9 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-6 py-5">
      <span class="rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] uppercase tracking-[1.2px] text-white">{{ t('career.distinction') }}</span>
      <span class="min-w-[260px] flex-1 text-[15px] font-semibold">{{ l(distinction) }}</span>
    </div>
  </div>
</template>
```

`SkillTiers.vue`:
```vue
<script setup lang="ts">
import type { SkillTier } from '~~/content/types'
defineProps<{ tiers: SkillTier[] }>()
const { t } = useI18n()
const l = useLocalized()
const chip = {
  core: 'rounded-lg bg-ink px-3.5 py-2 text-sm font-bold text-white',
  also: 'rounded-lg border-[1.5px] border-ink bg-surface px-3 py-[7px] text-sm font-semibold',
} as const
</script>

<template>
  <div id="skills" class="min-w-0">
    <SectionHeading number="04" :title="t('skills.title')" />
    <div v-for="tier in tiers" :key="tier.id" class="mt-8 first-of-type:mt-9">
      <h3 class="mb-3.5 font-mono text-xs font-bold uppercase tracking-[1.2px] text-accent">{{ l(tier.title) }}</h3>
      <p v-if="tier.id === 'notions'" class="text-[15px] text-muted">{{ tier.items.map(i => l(i)).join(' · ') }}</p>
      <ul v-else class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li v-for="(item, i) in tier.items" :key="i" :class="chip[tier.id]">{{ l(item) }}</li>
      </ul>
    </div>
  </div>
</template>
```

- [ ] **Step 8: Write `OtherProjects.vue`, `EducationList.vue`, `ContactBand.vue`**

`OtherProjects.vue`:
```vue
<script setup lang="ts">
import type { OtherProject } from '~~/content/types'
defineProps<{ items: OtherProject[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <div class="min-w-0">
    <SectionHeading number="05" :title="t('other.title')" />
    <ul class="m-0 mt-7 grid list-none gap-4 p-0 sm:grid-cols-2">
      <li v-for="(item, i) in items" :key="i" class="rounded-xl border border-line bg-paper p-5">
        <h3 class="mb-1.5 text-base font-bold">{{ l(item.title) }}</h3>
        <p class="m-0 text-sm leading-relaxed text-body">{{ l(item.description) }}</p>
        <a v-if="item.link" :href="item.link.url" target="_blank" rel="noopener" class="mt-2.5 inline-block text-sm font-bold no-underline">{{ t('other.code') }} ↗</a>
      </li>
    </ul>
  </div>
</template>
```

`EducationList.vue`:
```vue
<script setup lang="ts">
import type { EducationItem } from '~~/content/types'
defineProps<{ items: EducationItem[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <div class="min-w-0">
    <SectionHeading number="06" :title="t('education.title')" />
    <ul class="m-0 mt-7 list-none p-0">
      <li v-for="(item, i) in items" :key="i" class="border-b border-grid pb-5 pt-5 first:pt-0 last:border-0">
        <div class="flex flex-wrap justify-between gap-3">
          <h3 class="text-[17px] font-bold">{{ l(item.title) }}</h3>
          <span class="font-mono text-[13px] text-accent">{{ item.year }}</span>
        </div>
        <p class="mt-1.5 text-sm leading-relaxed text-body">{{ l(item.school) }}</p>
        <div v-if="item.badges.length" class="mt-2.5 flex flex-wrap gap-2">
          <Badge v-for="(badge, j) in item.badges" :key="j" :tone="badge.tone" :label="l(badge.label)" />
        </div>
      </li>
    </ul>
  </div>
</template>
```

`ContactBand.vue`:
```vue
<script setup lang="ts">
import type { Locale, Profile } from '~~/content/types'
import { cvPath } from '~~/content/profile'
defineProps<{ profile: Profile }>()
const { t, locale } = useI18n()
</script>

<template>
  <section id="contact" class="blueprint-dark bg-ink text-white">
    <div class="mx-auto flex max-w-[1240px] flex-col items-start gap-7 px-5 py-16 md:px-8 md:py-[104px]">
      <p class="inline-flex items-center gap-3 font-mono text-[13px] uppercase tracking-[1.5px] text-sky">
        <span class="inline-block h-0.5 w-7 bg-sky" aria-hidden="true" />{{ t('contact.eyebrow') }}
      </p>
      <h2 class="max-w-[900px] text-[2.4rem] font-extrabold leading-none tracking-[-0.035em] md:text-[4.5rem]">
        {{ t('contact.title') }}<br><span class="text-sky">{{ t('contact.titleAccent') }}</span>
      </h2>
      <p class="text-lg text-[#C9D3E2]">{{ t('contact.text') }}</p>
      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4">
        <a :href="`mailto:${profile.email}`" class="btn-light"><AppIcon name="mail" :size="18" />{{ t('contact.email') }}</a>
        <a :href="profile.whatsappUrl" target="_blank" rel="noopener" class="btn-outline-light"><AppIcon name="chat" :size="18" />{{ t('contact.whatsapp') }}</a>
        <a :href="cvPath(locale as Locale)" download class="btn-outline-light"><AppIcon name="download" :size="18" />{{ t('contact.cv') }}</a>
      </div>
      <p class="mt-2 font-mono text-sm text-mist">
        {{ profile.phone }} · {{ profile.email }} ·
        <a :href="profile.linkedinUrl" target="_blank" rel="noopener" class="text-mist hover:text-white">LinkedIn ↗</a> ·
        <a :href="profile.githubUrl" target="_blank" rel="noopener" class="text-mist hover:text-white">GitHub ↗</a>
      </p>
    </div>
  </section>
</template>
```

- [ ] **Step 9: Assemble the home page** — replace `app/pages/index.vue`

```vue
<script setup lang="ts">
import { profile } from '~~/content/profile'
import { projects } from '~~/content/projects'
import { otherProjects } from '~~/content/other-projects'
import { method } from '~~/content/method'
import { distinction, experience } from '~~/content/experience'
import { skillTiers } from '~~/content/skills'
import { education } from '~~/content/education'

const { t } = useI18n()
useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
})
</script>

<template>
  <div>
    <HeroSection :profile="profile" />
    <ProofStrip :stats="profile.stats" />
    <TrustRow :items="profile.deliveredFor" />
    <ProjectGrid :projects="projects" />
    <MethodSection :items="method" />
    <section class="mx-auto grid max-w-[1240px] gap-16 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[6fr_5fr] lg:gap-[72px]">
      <CareerTimeline :items="experience" :distinction="distinction" />
      <SkillTiers :tiers="skillTiers" />
    </section>
    <section class="border-t border-line bg-surface">
      <div class="mx-auto grid max-w-[1240px] gap-16 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[6fr_5fr] lg:gap-[72px]">
        <OtherProjects :items="otherProjects" />
        <EducationList :items="education" />
      </div>
    </section>
    <ContactBand :profile="profile" />
  </div>
</template>
```

- [ ] **Step 10: Make the case-study links resolve, then run the tests**

Create a temporary `app/pages/projets/[slug].vue` (Task 5 Step 3 replaces it):
```vue
<template>
  <section class="mx-auto max-w-[1240px] px-5 py-16"><h1 class="text-3xl font-extrabold">{{ $route.params.slug }}</h1></section>
</template>
```
In `nuxt.config.ts`, add at the top:
```ts
import { projectSlugs } from './content/projects'
```
inside `i18n: { … }` add:
```ts
    customRoutes: 'config',
    pages: {
      'projets/[slug]': { fr: '/projets/[slug]', en: '/projects/[slug]' },
    },
```
and replace the `nitro` block with:
```ts
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/en', ...projectSlugs.flatMap(slug => [`/projets/${slug}`, `/en/projects/${slug}`])],
    },
  },
```
Run: `npm test && npm run generate && npm run test:build`
Expected: PASS — FR cards link to `/projets/<slug>`, EN cards to `/en/projects/<slug>`. If the EN links come out as `/en/projets/<slug>`, the `pages` key does not match the page file; it must be the path under `app/pages` without extension (`projets/[slug]`).

- [ ] **Step 11: Visual check against the mockup**

Run `npx serve .output/public -l 4173` in the background, open `http://localhost:4173/` and `http://localhost:4173/en` with Playwright at 1440 × 900 and 390 × 844, take full-page screenshots, and compare them side by side with `MockHome` / `MockMobile`. Fix spacing or color mismatches in the components (not in content). Stop the server afterwards and delete any `.playwright-mcp/` folder Playwright created.

- [ ] **Step 12: Typecheck and commit**

```bash
npm run typecheck
git add app public/img tests/build/home.test.ts nuxt.config.ts
git commit -m "feat: build the bilingual home page in the Cahier technique design

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Case-study pages, 404, social images, sitemap and favicons

**Files:**
- Create: `app/pages/projets/[slug].vue`, `app/components/case/{CaseHeader,CaseToc,ArchitectureLayers,QualityStats,PrevNextNav,CtaBand}.vue`, `app/error.vue`, `public/robots.txt`, `public/sitemap.xml`, `public/favicon.svg`, `public/favicon.ico`, `public/og-fr.png`, `public/og-en.png`, `scripts/og-template.html`, `tests/build/case-studies.test.ts`, `tests/build/assets.test.ts`
- Modify: `app/pages/index.vue` (OG + JSON-LD); `app/pages/projets/[slug].vue` replaces the Task 4 placeholder

**Interfaces:**
- Consumes: `getProject`, `neighbours`, `projects`, `projectSlugs` (Task 2); `BrowserFrame`, `KioskSchematic`, `Badge`, `StackPill`, `AppIcon` (Tasks 3–4).
- Produces: route name `projets-slug` with paths `/projets/[slug]` (fr) and `/en/projects/[slug]` (en).

- [ ] **Step 1: Write the failing tests**

`tests/build/case-studies.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { projects } from '../../content/projects'
import { hasLink, htmlLang, meta, page, stripTags, title, urlVariants } from './helpers'

const LOCALES = [
  { lang: 'fr' as const, base: '/projets/', other: '/en/projects/', home: '/' },
  { lang: 'en' as const, base: '/en/projects/', other: '/projets/', home: '/en' },
]

describe.each(LOCALES)('case studies ($lang)', ({ lang, base, other, home }) => {
  it.each(projects.map(p => [p.slug, p] as const))('%s', (slug, project) => {
    const route = `${base}${slug}`
    const html = page(route)
    const text = stripTags(html)

    expect(htmlLang(html)).toBe(lang)
    expect(title(html)).toContain(project.title[lang].replace('&', '&amp;'))
    expect(meta(html, 'description')).toBeTruthy()
    expect(meta(html, 'og:image')).toBe(`https://jordan-tukum.pages.dev/og-${lang}.png`)
    expect(hasLink(html, 'canonical', urlVariants(route))).toBe(true)
    expect(hasLink(html, 'alternate', urlVariants(`/projets/${slug}`), 'fr')).toBe(true)
    expect(hasLink(html, 'alternate', urlVariants(`/en/projects/${slug}`), 'en')).toBe(true)
    // Review focus 1: the language switch keeps the same project
    expect(html).toContain(`href="${other}${slug}"`)
    // Review focus 2: navigation goes back to the home sections
    expect(html).toContain(`href="${home}#projects"`)
    expect(text).toContain(project.context[lang])
    expect(text).toContain(project.result[lang])
    if (project.keyDecision) expect(text).toContain(project.keyDecision[lang])
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(text).not.toMatch(/\[À COMPLÉTER|TODO|lorem/i)
  })
})

describe('case-study titles', () => {
  it('are unique across all 16 pages', () => {
    const titles = LOCALES.flatMap(({ base }) => projects.map(p => title(page(`${base}${p.slug}`))))
    expect(new Set(titles).size).toBe(16)
  })
})
```

`tests/build/assets.test.ts`:
```ts
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectSlugs } from '../../content/projects'
import { OUT, SITE, meta, page } from './helpers'

describe('static assets', () => {
  it.each(['404.html', 'robots.txt', 'sitemap.xml', 'favicon.svg', 'favicon.ico', 'og-fr.png', 'og-en.png'])('ships %s', (file) => {
    expect(existsSync(join(OUT, file))).toBe(true)
  })

  it('ships social images of 1200 × 630', () => {
    for (const file of ['og-fr.png', 'og-en.png']) {
      const png = readFileSync(join(OUT, file))
      expect(png.readUInt32BE(16)).toBe(1200)
      expect(png.readUInt32BE(20)).toBe(630)
      expect(statSync(join(OUT, file)).size).toBeLessThan(300_000)
    }
  })

  it('lists all 18 pages in the sitemap', () => {
    const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
    const expected = ['', '/en', ...projectSlugs.flatMap(s => [`/projets/${s}`, `/en/projects/${s}`])]
    for (const path of expected) expect(sitemap).toContain(`<loc>${SITE}${path}</loc>`)
    expect(sitemap.match(/<loc>/g)).toHaveLength(18)
  })

  it('points robots.txt at the sitemap', () => {
    expect(readFileSync(join(OUT, 'robots.txt'), 'utf8')).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  })

  it('gives the home pages social images and Person structured data', () => {
    for (const [route, lang] of [['/', 'fr'], ['/en', 'en']] as const) {
      const html = page(route)
      expect(meta(html, 'og:image')).toBe(`${SITE}/og-${lang}.png`)
      expect(meta(html, 'twitter:card')).toBe('summary_large_image')
      expect(html).toContain('"@type":"Person"')
    }
  })
})
```

Run: `npm run generate && npm run test:build`
Expected: FAIL — case-study pages and assets missing.

- [ ] **Step 2: Write the case components** (all in `app/components/case/`)

`CaseHeader.vue`:
```vue
<script setup lang="ts">
import type { Project } from '~~/content/types'
defineProps<{ project: Project }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <section class="blueprint bg-paper">
    <div class="mx-auto flex max-w-[1240px] flex-wrap items-start gap-14 px-5 pb-12 pt-12 md:px-8 md:pb-14 md:pt-[72px]">
      <div class="min-w-0 flex-[7_1_520px]">
        <p class="mb-6 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[1.5px] text-accent md:text-[13px]">
          <span class="inline-block h-0.5 w-7 bg-accent" aria-hidden="true" />{{ t('case.eyebrow', { number: project.number }) }} · {{ l(project.sector) }}
        </p>
        <h1 class="mb-6 text-[2.6rem] font-extrabold leading-[0.98] tracking-[-0.035em] md:text-[4.75rem]">{{ l(project.title) }}</h1>
        <p class="mb-7 max-w-[640px] text-lg leading-relaxed text-body md:text-[21px]">{{ l(project.summary) }}</p>
        <div class="flex flex-wrap gap-2">
          <Badge v-for="(badge, i) in project.badges" :key="i" :tone="badge.tone" :label="l(badge.label)" />
        </div>
      </div>
      <aside :aria-label="t('case.factsTitle')" class="min-w-0 flex-[5_1_340px] overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgb(19_32_58/0.06),0_16px_40px_rgb(19_32_58/0.08)]">
        <p class="m-0 bg-ink px-6 py-3.5 font-mono text-xs uppercase tracking-[1.5px] text-white">{{ t('case.factsTitle') }}</p>
        <dl class="m-0 px-6 py-1.5">
          <div class="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid py-3.5">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.role') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-semibold">{{ l(project.role) }}</dd>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid py-3.5">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.period') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-semibold">{{ l(project.period) }}</dd>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid py-3.5">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.organisation') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-semibold">{{ l(project.organisation) }}</dd>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 py-3.5" :class="project.links.length ? 'border-b border-grid' : ''">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.stack') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-semibold">{{ project.stack.join(' · ') }}</dd>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 py-3.5">
            <dt class="w-[110px] shrink-0 font-mono text-xs uppercase text-muted">{{ t('case.links') }}</dt>
            <dd class="m-0 min-w-[160px] flex-1 text-[15px] font-bold">
              <template v-if="project.links.length">
                <a v-for="link in project.links" :key="link.url" :href="link.url" target="_blank" rel="noopener" class="block break-all no-underline">{{ link.label }} ↗</a>
              </template>
              <span v-else class="font-semibold text-muted">{{ t('projects.privateCode') }}</span>
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  </section>
</template>
```

`CaseToc.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{ sections: Array<{ id: string; label: string }> }>()
const { t } = useI18n()
const active = ref(props.sections[0]?.id ?? '')
let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
    if (visible) active.value = visible.target.id
  }, { rootMargin: '-20% 0px -70% 0px' })
  for (const s of props.sections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav :aria-label="t('case.toc')" class="min-w-0 lg:sticky lg:top-24 lg:w-[220px] lg:shrink-0">
    <p class="mb-4 font-mono text-xs uppercase tracking-[1.5px] text-muted">{{ t('case.toc') }}</p>
    <ol class="m-0 flex list-none flex-wrap gap-1 p-0 text-[15px] font-semibold lg:flex-col">
      <li v-for="s in sections" :key="s.id">
        <a
          :href="`#${s.id}`" :aria-current="active === s.id ? 'location' : undefined"
          class="block rounded-lg px-3 py-2 no-underline" :class="active === s.id ? 'bg-accent-soft text-accent' : 'text-body hover:text-accent'"
        >{{ s.label }}</a>
      </li>
    </ol>
  </nav>
</template>
```

`ArchitectureLayers.vue`:
```vue
<script setup lang="ts">
import type { ArchitectureLayer } from '~~/content/types'
defineProps<{ layers: ArchitectureLayer[] }>()
const { t } = useI18n()
const l = useLocalized()
</script>

<template>
  <figure class="blueprint-dark m-0 flex flex-col gap-2.5 rounded-[14px] bg-ink p-5 md:p-7">
    <figcaption class="mb-1.5 font-mono text-[11px] uppercase tracking-[1.2px] text-sky">{{ t('case.architectureFigure') }}</figcaption>
    <template v-for="(layer, i) in layers" :key="i">
      <div v-if="i > 0" class="text-center text-sm leading-none text-sky" aria-hidden="true">↓</div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] border-[1.5px] border-sky bg-white/5 px-5 py-4">
        <span class="w-[120px] shrink-0 font-mono text-xs uppercase text-sky">{{ l(layer.label) }}</span>
        <span class="min-w-[220px] flex-1 text-[15px] font-semibold text-white">{{ l(layer.description) }}</span>
      </div>
    </template>
  </figure>
</template>
```

`QualityStats.vue`:
```vue
<script setup lang="ts">
import type { QualityItem } from '~~/content/types'
defineProps<{ items: QualityItem[] }>()
const l = useLocalized()
</script>

<template>
  <dl class="m-0 grid gap-4 sm:grid-cols-3">
    <div v-for="(item, i) in items" :key="i" class="flex flex-col-reverse justify-end rounded-xl border border-line bg-surface p-5">
      <dt class="mt-1.5 font-mono text-[11px] uppercase tracking-[1px] text-accent">{{ l(item.label) }}</dt>
      <dd class="m-0 text-[2rem] font-extrabold tracking-[-0.03em]">{{ l(item.value) }}</dd>
    </div>
  </dl>
</template>
```

`PrevNextNav.vue`:
```vue
<script setup lang="ts">
import type { Project } from '~~/content/types'
const props = defineProps<{ prev: Project; next: Project }>()
const { t } = useI18n()
const l = useLocalized()
const localePath = useLocalePath()
const to = (p: Project) => localePath({ name: 'projets-slug', params: { slug: p.slug } })
</script>

<template>
  <nav :aria-label="`${t('case.prev')} / ${t('case.next')}`" class="border-t border-line bg-surface">
    <div class="mx-auto grid max-w-[1240px] px-5 md:grid-cols-2 md:px-8">
      <NuxtLink :to="to(props.prev)" class="flex flex-col gap-2 py-7 pr-8 text-ink no-underline hover:text-accent">
        <span class="font-mono text-xs uppercase tracking-[1px] text-muted">← {{ t('case.prev') }} · № {{ prev.number }}</span>
        <span class="text-[22px] font-extrabold">{{ l(prev.title) }}</span>
      </NuxtLink>
      <NuxtLink :to="to(props.next)" class="flex flex-col gap-2 border-t border-grid py-7 text-ink no-underline hover:text-accent md:border-l md:border-t-0 md:pl-8 md:text-right">
        <span class="font-mono text-xs uppercase tracking-[1px] text-muted">{{ t('case.next') }} · № {{ next.number }} →</span>
        <span class="text-[22px] font-extrabold">{{ l(next.title) }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
```

`CtaBand.vue`:
```vue
<script setup lang="ts">
import type { Locale } from '~~/content/types'
import { cvPath, profile } from '~~/content/profile'
const { t, locale } = useI18n()
</script>

<template>
  <section class="blueprint-dark bg-ink text-white">
    <div class="mx-auto flex max-w-[1240px] flex-wrap items-center gap-6 px-5 py-14 md:px-8 md:py-16">
      <h2 class="min-w-[280px] flex-1 text-[1.8rem] font-extrabold leading-tight md:text-[2.1rem]">
        {{ t('case.ctaTitle') }}<br><span class="text-sky">{{ t('contact.titleAccent') }}</span>
      </h2>
      <a :href="`mailto:${profile.email}`" class="btn-light">{{ t('case.ctaContact') }}</a>
      <a :href="cvPath(locale as Locale)" download class="btn-outline-light">{{ t('contact.cv') }}</a>
    </div>
  </section>
</template>
```

- [ ] **Step 3: Write `app/pages/projets/[slug].vue`**

```vue
<script setup lang="ts">
import { getProject, neighbours } from '~~/content/projects'

const route = useRoute()
const { t, locale } = useI18n()
const l = useLocalized()
const site = useRuntimeConfig().public.siteUrl

const project = getProject(String(route.params.slug))
if (!project) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
const around = neighbours(project.slug)
const prev = getProject(around.prev)!
const next = getProject(around.next)!

const sections = computed(() => [
  { id: 'context', label: t('case.context') },
  { id: 'contribution', label: t('case.contribution') },
  { id: 'architecture', label: t('case.architecture') },
  { id: 'quality', label: t('case.quality') },
  { id: 'result', label: t('case.result') },
])

useSeoMeta({
  title: () => t('seo.caseTitle', { project: l(project.title) }),
  description: () => l(project.summary),
  ogTitle: () => t('seo.caseTitle', { project: l(project.title) }),
  ogDescription: () => l(project.summary),
  ogType: 'article',
  ogImage: () => `${site}/og-${locale.value}.png`,
  ogImageAlt: () => t('seo.ogAlt'),
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div>
    <CaseHeader :project="project" />
    <section v-if="project.image.kind !== 'none'" class="mx-auto max-w-[1240px] px-5 pb-16 pt-2 md:px-8">
      <BrowserFrame
        v-if="project.image.kind === 'screenshot'" :src="project.image.src" :alt="l(project.image.alt)"
        :url-label="project.image.url" :caption="`FIG. 01 — ${l(project.image.alt)}`" eager
      />
      <div v-else class="overflow-hidden rounded-[14px]"><KioskSchematic /></div>
    </section>
    <section class="mx-auto flex max-w-[1240px] flex-col gap-10 px-5 pb-20 md:px-8 lg:flex-row lg:items-start lg:gap-[72px]">
      <CaseToc :sections="sections" />
      <div class="min-w-0 max-w-[780px] flex-1">
        <p class="mb-2 font-mono text-xs font-bold text-accent">01</p>
        <h2 id="context" class="mb-4 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.context') }}</h2>
        <p class="mb-14 text-[17px] leading-[1.8] text-body">{{ l(project.context) }}</p>

        <p class="mb-2 font-mono text-xs font-bold text-accent">02</p>
        <h2 id="contribution" class="mb-4 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.contribution') }}</h2>
        <ul class="mb-14 list-disc space-y-2 pl-6 text-[17px] leading-[1.8] text-body marker:text-accent">
          <li v-for="(item, i) in project.contribution" :key="i">{{ l(item) }}</li>
        </ul>

        <p class="mb-2 font-mono text-xs font-bold text-accent">03</p>
        <h2 id="architecture" class="mb-5 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.architecture') }}</h2>
        <ArchitectureLayers :layers="project.architecture" />
        <div v-if="project.keyDecision" class="mt-5 rounded-[14px] border border-line bg-surface px-7 py-6">
          <span class="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[1.2px] text-accent">{{ t('case.keyDecision') }}</span>
          <p class="mt-3.5 text-[17px] leading-relaxed text-ink">{{ l(project.keyDecision) }}</p>
        </div>

        <p class="mb-2 mt-14 font-mono text-xs font-bold text-accent">04</p>
        <h2 id="quality" class="mb-5 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.quality') }}</h2>
        <QualityStats :items="project.quality" />

        <p class="mb-2 mt-14 font-mono text-xs font-bold text-accent">05</p>
        <h2 id="result" class="mb-4 text-[2rem] font-extrabold tracking-[-0.02em]">{{ t('case.result') }}</h2>
        <p class="text-[17px] leading-[1.8] text-body">{{ l(project.result) }}</p>
      </div>
    </section>
    <PrevNextNav :prev="prev" :next="next" />
    <CtaBand />
  </div>
</template>
```
(This file overwrites the temporary page created in Task 4 Step 10.)

- [ ] **Step 4: Add social meta and Person JSON-LD to the home page** — in `app/pages/index.vue`, replace the `useSeoMeta` call with:

```ts
const { t, locale } = useI18n()
const l = useLocalized()
const site = useRuntimeConfig().public.siteUrl
useSeoMeta({
  title: () => t('seo.homeTitle'),
  description: () => t('seo.homeDescription'),
  ogTitle: () => t('seo.homeTitle'),
  ogDescription: () => t('seo.homeDescription'),
  ogType: 'profile',
  ogSiteName: 'Jordan Tukum Folem',
  ogImage: () => `${site}/og-${locale.value}.png`,
  ogImageAlt: () => t('seo.ogAlt'),
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      'name': profile.name,
      'jobTitle': l(profile.title),
      'url': locale.value === 'en' ? `${site}/en` : site,
      'email': `mailto:${profile.email}`,
      'telephone': '+237698377389',
      'address': { '@type': 'PostalAddress', 'addressLocality': 'Douala', 'addressCountry': 'CM' },
      'worksFor': { '@type': 'Organization', 'name': 'ADWA SARL' },
      'sameAs': [profile.linkedinUrl, profile.githubUrl],
      'alumniOf': [
        { '@type': 'EducationalOrganization', 'name': 'Institut Universitaire du Golfe de Guinée (IUG)' },
        { '@type': 'EducationalOrganization', 'name': 'Douala Institute of Technology (DIT)' },
        { '@type': 'EducationalOrganization', 'name': 'Institut Universitaire de la Côte (IUC)' },
      ],
      'knowsAbout': ['Laravel', 'PHP', 'Vue.js', 'Nuxt', 'React', 'Next.js', 'TypeScript', 'REST APIs', 'MySQL', 'PostgreSQL', 'Automated testing', 'Docker'],
    }),
  }],
}))
```
(Delete the earlier `const { t } = useI18n()` line so `t` is declared once.)

- [ ] **Step 5: Write `app/error.vue`**

```vue
<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const is404 = computed(() => props.error.statusCode === 404)
useHead({ title: 'Page introuvable · Page not found — Jordan Tukum Folem', htmlAttrs: { lang: 'fr' } })
</script>

<template>
  <main class="blueprint grid min-h-screen place-items-center bg-paper px-5 py-16 text-ink">
    <div class="max-w-xl text-center">
      <p class="font-mono text-sm uppercase tracking-[1.5px] text-accent">Erreur {{ error.statusCode }} · Error {{ error.statusCode }}</p>
      <h1 class="mt-4 text-4xl font-extrabold md:text-5xl">{{ is404 ? 'Page introuvable' : 'Une erreur est survenue' }}</h1>
      <p class="mt-3 text-xl font-semibold text-body" lang="en">{{ is404 ? 'Page not found' : 'Something went wrong' }}</p>
      <div class="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
        <a href="/" class="btn-primary">Retour à l’accueil</a>
        <a href="/en" class="btn-secondary" lang="en">Back to home</a>
      </div>
    </div>
  </main>
</template>
```

- [ ] **Step 6: Write the static SEO files**

`public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://jordan-tukum.pages.dev/sitemap.xml
```

`public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://jordan-tukum.pages.dev</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/projets/services-publics</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en/projects/services-publics</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/projets/bornes-libre-service</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en/projects/bornes-libre-service</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/projets/ministere-fonction-publique</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en/projects/ministere-fonction-publique</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/projets/conformite-bancaire</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en/projects/conformite-bancaire</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/projets/equip4safety</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en/projects/equip4safety</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/projets/tv-satellite</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en/projects/tv-satellite</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/projets/schulyf</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en/projects/schulyf</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/projets/drymhome</loc></url>
  <url><loc>https://jordan-tukum.pages.dev/en/projects/drymhome</loc></url>
</urlset>
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#13203A"/><text x="32" y="41" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" font-weight="700" fill="#FFFFFF" letter-spacing="1">JTF</text></svg>
```

`public/favicon.ico` — generate:
```bash
python - <<'EOF'
from PIL import Image, ImageDraw, ImageFont
size = 256
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((0, 0, size - 1, size - 1), radius=48, fill=(19, 32, 58, 255))
font = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 96)
box = d.textbbox((0, 0), "JTF", font=font)
d.text(((size - (box[2] - box[0])) / 2 - box[0], (size - (box[3] - box[1])) / 2 - box[1]), "JTF", font=font, fill=(255, 255, 255, 255))
img.save("public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
EOF
```

- [ ] **Step 7: Render the two social images**

Write `scripts/og-template.html`:
```html
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;800&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
  html, body { margin: 0; }
  body { width: 1200px; height: 630px; background: #F6F7F9; font-family: Montserrat, sans-serif; color: #13203A;
    background-image: linear-gradient(#E6EBF2 1px, transparent 1px), linear-gradient(90deg, #E6EBF2 1px, transparent 1px); background-size: 32px 32px; }
  .wrap { box-sizing: border-box; height: 630px; padding: 72px 80px; display: flex; flex-direction: column; }
  .eyebrow { font-family: "JetBrains Mono", monospace; font-size: 22px; letter-spacing: 2px; color: #2E5BA8; display: flex; align-items: center; gap: 16px; text-transform: uppercase; }
  .eyebrow::before { content: ""; width: 40px; height: 3px; background: #2E5BA8; }
  h1 { font-size: 104px; line-height: 0.95; font-weight: 800; letter-spacing: -4px; margin: 36px 0 28px; }
  h1 span { color: #2E5BA8; }
  p { font-size: 30px; font-weight: 500; color: #3A4A66; margin: 0; max-width: 960px; }
  .foot { margin-top: auto; display: flex; gap: 14px; font-family: "JetBrains Mono", monospace; font-size: 22px; }
  .chip { background: #13203A; color: #fff; padding: 10px 18px; border-radius: 8px; font-weight: 700; }
  .chip.soft { background: #EAF0FA; color: #2E5BA8; }
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow" id="eyebrow"></div>
  <h1>Jordan<br>Tukum Folem<span>.</span></h1>
  <p id="lead"></p>
  <div class="foot"><span class="chip">Laravel · Vue · React</span><span class="chip soft" id="tests"></span><span class="chip soft">jordan-tukum.pages.dev</span></div>
</div>
<script>
  const en = location.hash === '#en'
  document.getElementById('eyebrow').textContent = en ? 'Full Stack Web & Mobile Developer — Douala' : 'Développeur Full Stack Web & Mobile — Douala'
  document.getElementById('lead').textContent = en ? 'Web and mobile platforms shipped at national scale in Cameroon.' : 'Des plateformes web et mobiles livrées à l’échelle nationale au Cameroun.'
  document.getElementById('tests').textContent = en ? '2,000+ tests' : '2 000+ tests'
</script>
</body>
</html>
```
Serve the repo root (`python -m http.server 8766 --bind 127.0.0.1` in the background), then with Playwright: resize to 1200 × 630, open `http://127.0.0.1:8766/scripts/og-template.html#fr`, wait 2 s for fonts, screenshot the viewport (PNG) to `C:\Users\jtuku\OneDrive\Documents\CV\.playwright-mcp\og-fr.png`; repeat with `#en` (reload the page after changing the hash) → `og-en.png`. Copy both into `public/`, delete the `.playwright-mcp` folder and stop the server. Check: `python -c "from PIL import Image; [print(f, Image.open('public/'+f).size) for f in ('og-fr.png','og-en.png')]"` → `(1200, 630)` twice; if a file exceeds 300 KB, re-save with `Image.open(p).quantize(256).save(p, optimize=True)`.

- [ ] **Step 8: Run all tests**

Run: `npm test && npm run generate && npm run test:build`
Expected: PASS — 16 case-study cases, unique titles, assets, home tests. If the switch-link assertion fails, inspect `switchLocalePath` output in the generated HTML and the `pages` key in `nuxt.config.ts`; the key must match the page file path `projets/[slug]`.

- [ ] **Step 9: Visual check against `MockCase`**

Serve `.output/public`, screenshot `/projets/services-publics`, `/projets/bornes-libre-service` and `/en/projects/schulyf` at 1440 and 390 px, compare with the `MockCase` artboard, fix component styling. Open `/projets/inconnu` and confirm the 404 page appears. Clean up `.playwright-mcp/` and stop the server.

- [ ] **Step 10: Typecheck and commit**

```bash
npm run typecheck
git add app public scripts tests/build
git commit -m "feat: add bilingual case-study pages, 404, social images, sitemap and favicons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: General CVs (FR + EN) served by the site

**Files:**
- Create (CV workspace, outside the repo): `C:\Users\jtuku\OneDrive\Documents\CV\Candidatures\_outils\build_cv_general.js`; outputs `C:\Users\jtuku\OneDrive\Documents\CV\CV_general\CV_Jordan_TUKUM_FOLEM_FR.{docx,pdf}` and `…_EN.{docx,pdf}`
- Create (repo): `public/cv/CV_Jordan_TUKUM_FOLEM_FR.pdf`, `public/cv/CV_Jordan_TUKUM_FOLEM_EN.pdf`, `tests/build/cv.test.ts`

**Interfaces:**
- Consumes: `cvPath()` (Task 2) — file names must equal its output.

- [ ] **Step 1: Write the failing test `tests/build/cv.test.ts`**

```ts
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cvPath } from '../../content/profile'
import { OUT, page } from './helpers'

describe('downloadable CVs', () => {
  it.each(['fr', 'en'] as const)('ships the %s PDF', (locale) => {
    const file = join(OUT, cvPath(locale))
    expect(readFileSync(file).subarray(0, 5).toString()).toBe('%PDF-')
    expect(statSync(file).size).toBeGreaterThan(50_000)
  })

  // Review focus 3: each language offers its own CV
  it('links the French CV from French pages and the English CV from English pages', () => {
    for (const [route, locale] of [['/', 'fr'], ['/en', 'en'], ['/projets/schulyf', 'fr'], ['/en/projects/schulyf', 'en']] as const) {
      const html = page(route)
      expect(html).toContain(`href="${cvPath(locale)}"`)
      expect(html).not.toContain(`href="${cvPath(locale === 'fr' ? 'en' : 'fr')}"`)
    }
  })
})
```
Run: `npm run generate && npm run test:build` — Expected: FAIL (PDFs missing).

- [ ] **Step 2: Write `build_cv_general.js`**

Start from `Candidatures/_outils/build_kes.js` (same helpers `fr()`, `run`, `link`, `heading`, `rich`, `bullet`, `job`, `skillRow`, numbering and page setup). Keep the CV half only, wrapped as `buildCv(L)` where `L` holds every string; delete the letter half. Content of `L` for the two languages:

```js
const COMMON = {
  name: 'JORDAN TUKUM FOLEM',
  phone: '(+237) 698 377 389', email: 'jtukum@outlook.com',
  linkedin: 'linkedin.com/in/jordan-tukum-811017137', github: 'github.com/kiri1101', site: 'jordan-tukum.pages.dev',
}

const FR = {
  ...COMMON, lang: 'fr',
  title: 'DÉVELOPPEUR FULL STACK WEB & MOBILE',
  tagline: 'Laravel · Vue.js · React · Lead technique  —  plus de 5 ans d’expérience',
  city: 'Douala, Cameroun', portfolio: 'Portfolio : ',
  h: { profile: 'PROFIL', skills: 'COMPÉTENCES TECHNIQUES', exp: 'EXPÉRIENCE PROFESSIONNELLE', side: 'PROJETS INDÉPENDANTS', edu: 'FORMATION', misc: 'LANGUES & DISTINCTION' },
  profile: 'Développeur full stack avec **plus de cinq ans d’expérience** dans la conception, le développement, les tests et la mise en production d’applications web et mobiles pour des institutions publiques et des entreprises du Cameroun (Ministère des Finances, CAMRAIL, Port Autonome de Douala, Autorité Aéronautique du Cameroun). **Lead technique d’équipes de 3 à 6 développeurs** chez ADWA SARL, en méthodologie Agile. Spécialiste **Laravel, Vue.js et React**, attaché à la qualité logicielle : **plus de 2 000 tests automatisés** sur mes projets récents, intégration continue et documentation. Double formation en génie logiciel et en génie électrique & électronique.',
  skills: [
    ['Back-end', 'PHP 8, **Laravel** (10 à 13), API RESTful, authentification (Sanctum, Fortify, OTP), temps réel (Reverb, WebSockets), files d’attente · **Python** (Flask, pytest) · Node.js / Nitro'],
    ['Front-end', '**Vue.js 3**, Nuxt 4, **React**, Next.js, TypeScript, JavaScript (ES6+), HTML5, CSS3, Tailwind CSS, PrimeVue, Inertia.js · interfaces bilingues FR/EN'],
    ['Mobile & desktop', 'Application **Android** avec Quasar · **Flutter** (projets antérieurs) · Tauri 2 et Electron (bornes interactives, pilotage de périphériques)'],
    ['Bases de données', 'MySQL, MariaDB, PostgreSQL, Redis · MongoDB (projets personnels) · modélisation UML'],
    ['Qualité & DevOps', '**Tests unitaires et fonctionnels** (Pest, PHPUnit, Vitest, pytest, Playwright) · Git (GitHub, Bitbucket) · CI/CD (GitHub Actions, Bitbucket Pipelines) · Docker'],
    ['Intégrations', 'Mobile Money (MeSomb), SMS / OTP (Vonage), e-mail (SendGrid), ERP, Slack, Google Sheets, GoDaddy DNS, GoHighLevel'],
    ['Méthodes & outils', '**Agile / Scrum**, Jira, Trello, Notion · revues de code, ADR, documentation technique'],
    ['Notions', 'Kotlin, Java, Rust, Angular, NestJS'],
  ],
  jobs: [
    { role: 'Lead Développeur Full Stack', org: 'ADWA SARL, Douala', dates: 'mai 2023 – aujourd’hui',
      intro: 'Pilotage technique d’équipes de 3 à 6 développeurs (Agile : Jira, Trello, Notion), de l’analyse des besoins à la mise en production et à la maintenance.',
      bullets: [
        '**SERVICES PUBLICS** (services-publics.cm, Ministère des Finances) — lead développeur du portail national qui centralise les démarches administratives et la collecte des recettes non fiscales : authentification OTP, déclarations avec pièces justificatives, paiements en ligne. Laravel, Vue.js / Inertia (SSR), Docker.',
        '**Ministère de la Fonction Publique et de la Réforme Administrative** — plateforme des procédures administratives (servicepublic.gov.cm) : API Laravel 12 avec contrôle d’accès par rôles et interface React / TypeScript ; plus de 280 tests automatisés et contrat d’API vérifié par la suite de tests.',
        '**Conformité bancaire (zone CEMAC)** — application de collecte, de contrôle et de suivi de la documentation clients exigée des banques pour les transferts internationaux. Nuxt 4, TypeScript, Zod ; plus de 180 tests unitaires (Vitest).',
        '**Bornes en libre-service** — billetterie CAMRAIL déployée sur bornes interactives dans les gares de Douala et Yaoundé ; borne multiservices pour un transporteur interurbain : application Tauri 2 + Nuxt 4 pilotant imprimante thermique, lecteur QR et scanner d’identité, reliée à l’ERP par une API façade.',
        '**Application mobile & back-office (TV par satellite)** — application Android packagée avec Quasar, API mobile et back-office Laravel / Vue.js : abonnements, paiement Mobile Money (MeSomb), OTP par SMS.',
        '**EQUIP4SAFETY** — pilotage technique d’une marketplace B2B d’équipements aéronautiques entre États membres de l’OACI, commanditée par l’Autorité Aéronautique du Cameroun (CCAA). API Laravel, interface Next.js / React.',
        '**Port Autonome de Douala** — contribution à l’automatisation de la collecte de la redevance TEL (Travail Extra-Légal), avec la CAMCIS.',
        '**Autres réalisations** — SaaS de gestion de stocks et de suivi des ventes ; plateforme de dons pour l’ONG SWAA Littoral ; conteneurisation Docker et pipelines CI/CD.',
      ] },
    { role: 'Développeur Full Stack', org: 'VMEDIA CONSULTING, Douala', dates: 'oct. 2022 – avr. 2023',
      bullets: ['Développement et maintenance de plusieurs produits SaaS pour le compte de clients.', 'Intégration d’API tierces (GoHighLevel, Slack, Google Sheets, GoDaddy DNS) pour automatiser les processus métier.'] },
    { role: 'Développeur Full Stack', org: 'FORAMA, Douala', dates: 'déc. 2020 – oct. 2022',
      bullets: ['Conception et maintenance de **HAURIZON SHOP**, la plateforme e-commerce de l’entreprise.', 'Mise à niveau de **HAURIZON PAY**, plateforme SaaS de paiement : stabilité et performances améliorées, goulots d’étranglement résolus en production.'] },
    { role: 'Stagiaire informatique', org: 'HYDRAC', dates: 'sept. – nov. 2020',
      bullets: ['Maintenance du réseau et des serveurs ; développement d’outils logiciels pour lever des blocages opérationnels.'] },
  ],
  side: [
    '**SchuLyf** — gestion universitaire (code public : github.com/kiri1101/student-management-system) : admissions, **reçus signés (HMAC) vérifiables en ligne**, accès aux examens selon la situation financière. Laravel 13, Inertia, Vue 3 ; plus de 580 tests, documentation complète, CI.',
    '**DrymHome** — plateforme de location (locataires et agents) : API Laravel 13, notifications temps réel et push, stockage S3, applications Nuxt 4 ; plus de 970 tests automatisés.',
    '**yt-mp3** — application **Python / Flask** conçue pour un proche non-voyant ; tests pytest et CI (code public).',
  ],
  edu: [
    { title: 'BTech (Bac+3) en Génie Logiciel', org: 'IUG Douala, sous la tutelle de l’Université de Bamenda', year: '2026',
      note: '60/60 crédits validés · **GPA 3,27/4** · diplôme en cours de délivrance. Meilleurs modules : Bases de données relationnelles (86/100), Conception de sites web (85/100), Systèmes intelligents (78,5/100), Projet de fin d’études (77,5/100).' },
    { title: 'BTech (Bac+3) en Génie Électrique & Électronique, option Télécommunications', org: 'DIT, Douala', year: '2020' },
    { title: 'HND (Bac+2) en Génie Électrique & Électronique, option Télécommunications', org: 'IUC, Douala', year: '2019' },
  ],
  misc: ['**Langues** : français et anglais — bilingue (écrit et oral).', '**Distinction** : délégué officiel de la CCAA à l’AFI Aviation Week 2025, Victoria Falls (Zimbabwe).'],
}

const EN = {
  ...COMMON, lang: 'en',
  title: 'FULL STACK WEB & MOBILE DEVELOPER',
  tagline: 'Laravel · Vue.js · React · Technical lead  —  5+ years of experience',
  city: 'Douala, Cameroon', portfolio: 'Portfolio: ',
  h: { profile: 'PROFILE', skills: 'TECHNICAL SKILLS', exp: 'PROFESSIONAL EXPERIENCE', side: 'INDEPENDENT PROJECTS', edu: 'EDUCATION', misc: 'LANGUAGES & DISTINCTION' },
  profile: 'Full stack developer with **more than five years of experience** designing, building, testing and shipping web and mobile applications for public institutions and companies in Cameroon (Ministry of Finance, CAMRAIL, Port of Douala, Cameroon Civil Aviation Authority). **Technical lead of teams of 3–6 developers** at ADWA SARL, working in Agile. **Laravel, Vue.js and React** specialist committed to software quality: **2,000+ automated tests** across recent projects, continuous integration and documentation. Dual background in software engineering and electrical & electronic engineering.',
  skills: [
    ['Back end', 'PHP 8, **Laravel** (10 to 13), RESTful APIs, authentication (Sanctum, Fortify, OTP), real-time (Reverb, WebSockets), queues · **Python** (Flask, pytest) · Node.js / Nitro'],
    ['Front end', '**Vue.js 3**, Nuxt 4, **React**, Next.js, TypeScript, JavaScript (ES6+), HTML5, CSS3, Tailwind CSS, PrimeVue, Inertia.js · bilingual FR/EN interfaces'],
    ['Mobile & desktop', '**Android** app with Quasar · **Flutter** (earlier projects) · Tauri 2 and Electron (interactive kiosks, peripheral control)'],
    ['Databases', 'MySQL, MariaDB, PostgreSQL, Redis · MongoDB (personal projects) · UML modelling'],
    ['Quality & DevOps', '**Unit and feature testing** (Pest, PHPUnit, Vitest, pytest, Playwright) · Git (GitHub, Bitbucket) · CI/CD (GitHub Actions, Bitbucket Pipelines) · Docker'],
    ['Integrations', 'Mobile Money (MeSomb), SMS / OTP (Vonage), email (SendGrid), ERP, Slack, Google Sheets, GoDaddy DNS, GoHighLevel'],
    ['Methods & tools', '**Agile / Scrum**, Jira, Trello, Notion · code reviews, ADRs, technical documentation'],
    ['Familiar with', 'Kotlin, Java, Rust, Angular, NestJS'],
  ],
  jobs: [
    { role: 'Lead Full Stack Developer', org: 'ADWA SARL, Douala', dates: 'May 2023 – present',
      intro: 'Technical lead of teams of 3–6 developers (Agile: Jira, Trello, Notion), from requirements analysis to production and maintenance.',
      bullets: [
        '**SERVICES PUBLICS** (services-publics.cm, Ministry of Finance) — lead developer of the national portal for administrative procedures and non-tax revenue collection: OTP authentication, declarations with supporting documents, online payments. Laravel, Vue.js / Inertia (SSR), Docker.',
        '**Ministry of Public Service and Administrative Reform** — administrative procedures platform (servicepublic.gov.cm): Laravel 12 API with role-based access control and a React / TypeScript interface; 280+ automated tests and an API contract enforced by the test suite.',
        '**Banking compliance (CEMAC zone)** — application to collect, check and track the client documentation banks must hold for international transfers. Nuxt 4, TypeScript, Zod; 180+ unit tests (Vitest).',
        '**Self-service kiosks** — CAMRAIL ticketing deployed on interactive kiosks in Douala and Yaoundé stations; multi-service kiosk for an intercity bus operator: Tauri 2 + Nuxt 4 app driving a thermal printer, QR reader and ID scanner, connected to the ERP through a façade API.',
        '**Mobile app & back office (satellite TV)** — Android app packaged with Quasar, mobile API and Laravel / Vue.js back office: subscriptions, Mobile Money payments (MeSomb), SMS OTP.',
        '**EQUIP4SAFETY** — technical lead of a B2B aviation-equipment marketplace for ICAO member states, commissioned by the Cameroon Civil Aviation Authority (CCAA). Laravel API, Next.js / React front end.',
        '**Port of Douala** — contributed to automating the collection of the TEL port fee, with CAMCIS.',
        '**Other work** — inventory and sales-tracking SaaS; donation platform for the NGO SWAA Littoral; Docker containerisation and CI/CD pipelines.',
      ] },
    { role: 'Full Stack Developer', org: 'VMEDIA CONSULTING, Douala', dates: 'Oct 2022 – Apr 2023',
      bullets: ['Built and maintained several SaaS products for clients.', 'Integrated third-party APIs (GoHighLevel, Slack, Google Sheets, GoDaddy DNS) to automate business processes.'] },
    { role: 'Full Stack Developer', org: 'FORAMA, Douala', dates: 'Dec 2020 – Oct 2022',
      bullets: ['Designed and maintained **HAURIZON SHOP**, the company’s e-commerce platform.', 'Upgraded **HAURIZON PAY**, a SaaS payment platform: better stability and performance, production bottlenecks resolved.'] },
    { role: 'IT Intern', org: 'HYDRAC', dates: 'Sep – Nov 2020',
      bullets: ['Network and server maintenance; built small software tools to remove operational blockers.'] },
  ],
  side: [
    '**SchuLyf** — university administration (public code: github.com/kiri1101/student-management-system): admissions, **HMAC-signed receipts verifiable online**, exam access based on payment standing. Laravel 13, Inertia, Vue 3; 580+ tests, full documentation, CI.',
    '**DrymHome** — rental platform (tenants and agents): Laravel 13 API, real-time and push notifications, S3 storage, Nuxt 4 apps; 970+ automated tests.',
    '**yt-mp3** — **Python / Flask** app built for a blind relative; pytest and CI (public code).',
  ],
  edu: [
    { title: 'BTech in Software Engineering', org: 'IUG Douala, under the mentorship of the University of Bamenda', year: '2026',
      note: '60/60 credits · **GPA 3.27/4** · degree being issued. Top modules: Relational Databases (86/100), Website Design (85/100), Intelligent Systems (78.5/100), Final-year Project (77.5/100).' },
    { title: 'BTech in Electrical & Electronic Engineering (Telecommunications)', org: 'DIT, Douala', year: '2020' },
    { title: 'HND in Electrical & Electronic Engineering (Telecommunications)', org: 'IUC, Douala', year: '2019' },
  ],
  misc: ['**Languages**: French and English — bilingual (written and spoken).', '**Distinction**: official CCAA delegate at AFI Aviation Week 2025, Victoria Falls (Zimbabwe).'],
}
```

Two helper changes when copying from `build_kes.js`: the typography helper becomes language-aware, and the skills table becomes a function.
```js
let TYPO = true
const fr = (s) => (TYPO ? s.replace(/ ([:;!?])/g, ' $1') : s)

const skillsTable = (rows) => new Table({
  width: { size: CW, type: WidthType.DXA },
  columnWidths: [LABEL_W, CW - LABEL_W],
  borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
  rows: rows.map(([label, value]) => skillRow(label, value)),
})
```
`buildCv(L)` (uses `run`, `link`, `heading`, `rich`, `bullet`, `job`, `skillRow`, `numbering`, `CW`, colors and `FONT` exactly as in `build_kes.js`):
```js
function buildCv(L) {
  TYPO = L.lang === 'fr'
  const center = (after, children) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after }, children })
  const children = [
    center(0, [run(L.name, { bold: true, size: 46, color: NAVY, characterSpacing: 30 })]),
    center(20, [run(L.title, { bold: true, size: 24, color: BLUE, characterSpacing: 20 })]),
    center(30, [run(L.tagline, { italics: true, size: 19, color: GREY })]),
    center(0, [run(`${L.phone}   |   `, { size: 18 }), link(L.email, `mailto:${L.email}`, { size: 18 }), run(`   |   ${L.city}`, { size: 18 })]),
    center(40, [
      link(L.linkedin, `https://${L.linkedin}`, { size: 18 }), run('   |   ', { size: 18 }),
      link(L.github, `https://${L.github}`, { size: 18 }), run(`   |   ${L.portfolio}`, { size: 18 }),
      link(L.site, `https://${L.site}`, { size: 18 }),
    ]),
    heading(L.h.profile),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 20, line: 262 }, children: rich(L.profile, { size: 20 }) }),
    heading(L.h.skills),
    skillsTable(L.skills),
    heading(L.h.exp),
    ...L.jobs.flatMap(j => [
      ...job(j.role, j.org, j.dates, j.intro),
      ...j.bullets.map((b, i) => bullet(b, i === j.bullets.length - 1 ? 40 : undefined)),
    ]),
    heading(L.h.side),
    ...L.side.map(b => bullet(b)),
    heading(L.h.edu),
    ...L.edu.flatMap((e, i) => [
      new Paragraph({
        keepNext: Boolean(e.note),
        spacing: { before: i === 0 ? 60 : 0, after: e.note ? 10 : 30 },
        tabStops: [{ type: TabStopType.RIGHT, position: CW }],
        children: [
          run(e.title, { bold: true, size: 20, color: NAVY }),
          run(`  —  ${e.org}`, { size: 19, color: GREY }),
          new TextRun({ font: FONT, children: [new Tab(), e.year], italics: true, size: 19, color: BLUE }),
        ],
      }),
      ...(e.note ? [new Paragraph({ spacing: { after: 50 }, children: rich(e.note, { size: 19 }) })] : []),
    ]),
    heading(L.h.misc),
    ...L.misc.map(b => bullet(b)),
  ]
  return new Document({
    creator: 'Jordan TUKUM FOLEM',
    title: `CV — Jordan TUKUM FOLEM — ${L.title}`,
    styles: { default: { document: { run: { font: FONT, size: 19, color: '222222' } } } },
    numbering,
    sections: [{ properties: { page: { margin: { top: 620, bottom: 560, left: 720, right: 720 } } }, children }],
  })
}
```
Main:
```js
(async () => {
  const OUT = process.argv[2]
  fs.mkdirSync(OUT, { recursive: true })
  for (const L of [FR, EN]) {
    const doc = buildCv(L)
    fs.writeFileSync(path.join(OUT, `CV_Jordan_TUKUM_FOLEM_${L.lang.toUpperCase()}.docx`), await Packer.toBuffer(doc))
  }
  console.log('written to', OUT)
})()
```

- [ ] **Step 3: Build, export to PDF with Word, check page counts**

```bash
S="<session scratchpad>"; T="/c/Users/jtuku/OneDrive/Documents/CV/Candidatures/_outils"
cd "$S" && (test -d node_modules/docx || (npm init -y >/dev/null && npm install docx))
NODE_PATH="$S/node_modules" node "$T/build_cv_general.js" "/c/Users/jtuku/OneDrive/Documents/CV/CV_general"
```
Then in PowerShell: `& "C:\Users\jtuku\OneDrive\Documents\CV\Candidatures\_outils\to_pdf.ps1" -Dir "C:\Users\jtuku\OneDrive\Documents\CV\CV_general"`
Expected: both CVs report `2 page(s)`. Render with `pdftoppm -png -r 80` and look at every page; tighten bullet spacing if a CV spills onto a third page.

- [ ] **Step 4: Copy into the site and run the tests**

```bash
mkdir -p public/cv
cp "/c/Users/jtuku/OneDrive/Documents/CV/CV_general/CV_Jordan_TUKUM_FOLEM_FR.pdf" "/c/Users/jtuku/OneDrive/Documents/CV/CV_general/CV_Jordan_TUKUM_FOLEM_EN.pdf" public/cv/
npm run generate && npm run test:build
```
Expected: PASS.

- [ ] **Step 5: Commit (repo only — the CV workspace is not a git repo)**

```bash
git add public/cv tests/build/cv.test.ts
git commit -m "feat: serve general French and English CVs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: CI, legacy cleanup, README and the full quality gate

**Files:**
- Create: `.github/workflows/ci.yml`, `README.md`
- Delete: `index.html`, `assets/main.css` (legacy single page)

- [ ] **Step 1: Delete the legacy files and confirm nothing references them**

```bash
git rm index.html assets/main.css
grep -rn "assets/main.css" app nuxt.config.ts || echo "no references"
```
Expected: `no references`.

- [ ] **Step 2: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, redesign]
  pull_request:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run generate
      - run: npm run test:build
      - if: github.ref == 'refs/heads/main'
        uses: actions/upload-pages-artifact@v3
        with:
          path: .output/public

  deploy-mirror:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Write `README.md`**

```markdown
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
```

- [ ] **Step 4: Run the full gate**

Run: `npm run check`
Expected: typecheck exit 0; unit tests PASS; generate succeeds; build tests PASS.

- [ ] **Step 5: Lighthouse and the mobile check (Review focus 5)**

Serve `.output/public` on `http://localhost:4173`. Run the Lighthouse audit (chrome-devtools MCP `lighthouse_audit`, mobile) on `/`, `/en` and `/projets/services-publics`. Targets: performance ≥ 90, accessibility ≥ 95, best practices ≥ 95, SEO ≥ 95. Fix what it reports (common: image dimensions, contrast, tap targets). Then at 390 × 844 scroll to the bottom of `/` and confirm the footer text is fully visible above the fixed WhatsApp / CV bar. Stop the server; delete any `.playwright-mcp/` folder.

- [ ] **Step 6: Commit**

```bash
git add .github README.md
git commit -m "ci: add CI with GitHub Pages mirror deploy; remove the legacy single page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Rollout (owner-gated)

**Files:** none (deployment and records).

- [ ] **Step 1: Ask the owner to update the Cloudflare build settings** (Workers & Pages → `jordan-tukum` → Settings → Build): build command `npx nuxi generate`, output directory `.output/public`, environment variable `NODE_VERSION` = `24`. Wait for confirmation.

- [ ] **Step 2: Ask the owner for the go to push `redesign`**, then:

```bash
git push -u origin redesign
```

- [ ] **Step 3: Verify the preview from the owner's network — without following redirects**

```bash
B=https://redesign.jordan-tukum.pages.dev
for p in / /en /projets/schulyf /en/projects/schulyf /cv/CV_Jordan_TUKUM_FOLEM_FR.pdf /projets/inconnu; do
  printf "%-45s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$B$p")"
done
```
Expected: `200` for the first five and `404` for `/projets/inconnu` — no `301`/`307`/`308`: the canonical, hreflang and sitemap URLs must answer 200 directly (final review #2). The first Cloudflare build takes a few minutes; re-run until green or the build log shows an error. Also confirm the GitHub Actions run on `redesign` is green (`gh run list --branch redesign --limit 1`). Ask the owner to review the preview on their phone.

- [ ] **Step 4: Before merging, ask the owner to switch the GitHub Pages source** — GitHub → repo Settings → Pages → Source = "GitHub Actions". The repo is still on the legacy "branch: main /" source; merging first would make Jekyll render the README at kiri1101.github.io (final review #4). Confirm with `gh api repos/kiri1101/kiri1101.github.io/pages --jq .build_type` → `workflow`.

- [ ] **Step 5: On the owner's go, merge and publish**

```bash
git switch main && git pull --ff-only && git merge --ff-only redesign && git push origin main
```
Then verify `https://jordan-tukum.pages.dev/` serves the new site (look for `Projets sélectionnés` in the HTML), confirm the `deploy-mirror` job succeeds, and check the mirror's `https://kiri1101.github.io/en` once (expected 200, through a VPN if needed).

- [ ] **Step 6: Record the outcome** in `C:\Users\jtuku\OneDrive\Documents\CV\CLAUDE.md` (portfolio section: live, URLs, how to edit content, where the general CVs live: `CV_general/`).
