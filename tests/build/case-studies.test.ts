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
