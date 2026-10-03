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
