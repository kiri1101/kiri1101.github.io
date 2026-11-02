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
