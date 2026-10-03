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

describe.each(['/', '/en'])('home %s — accessibility details', (route) => {
  const html = page(route)

  it('includes the visible "JTF" text in the logo link’s accessible name', () => {
    expect(html).toMatch(/<a[^>]*aria-label="JTF[^"]*"[^>]*>\s*JTF\s*<\/a>/)
  })

  it('underlines links that sit inside same-coloured text', () => {
    const inline = [...html.matchAll(/<a[^>]*href="(https:\/\/(?:github\.com\/kiri1101(?:\/kiri1101\.github\.io)?|linkedin\.com\/in\/[^"]+))"[^>]*class="([^"]*)"[^>]*>(?:LinkedIn|GitHub|code source|source code)/g)]
    expect(inline.length).toBeGreaterThanOrEqual(3)
    for (const [, href, cls] of inline) expect(cls, href).toMatch(/\bunderline\b/)
  })
})
