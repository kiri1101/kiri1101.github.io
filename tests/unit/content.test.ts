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
