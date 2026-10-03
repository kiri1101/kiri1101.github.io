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
