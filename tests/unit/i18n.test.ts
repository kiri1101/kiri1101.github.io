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

describe('SEO description wording', () => {
  it('does not claim mobile platforms at national scale', () => {
    expect((fr as { seo: { homeDescription: string } }).seo.homeDescription).toContain('dont plusieurs')
    expect((en as { seo: { homeDescription: string } }).seo.homeDescription).toContain('several of them')
  })
})
