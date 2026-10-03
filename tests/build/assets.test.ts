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
