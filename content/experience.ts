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
