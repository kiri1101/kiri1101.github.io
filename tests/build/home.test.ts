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
