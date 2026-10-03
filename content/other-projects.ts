import type { OtherProject } from './types'

export const otherProjects: OtherProject[] = [
  {
    title: { fr: 'Port Autonome de Douala', en: 'Port of Douala' },
    description: {
      fr: 'Contribution à l’automatisation de la collecte de la redevance TEL, avec la CAMCIS.',
      en: 'Contributed to automating the collection of the TEL port fee, with CAMCIS.',
    },
  },
  {
    title: { fr: 'HAURIZON PAY & SHOP', en: 'HAURIZON PAY & SHOP' },
    description: { fr: 'Plateforme de paiement SaaS et boutique e-commerce (FORAMA).', en: 'SaaS payment platform and e-commerce shop (FORAMA).' },
  },
  {
    title: { fr: 'yt-mp3', en: 'yt-mp3' },
    description: { fr: 'Application Python / Flask conçue pour un proche non-voyant.', en: 'Python / Flask app built for a blind relative.' },
    link: { url: 'https://github.com/kiri1101/yt-mp3' },
  },
  {
    title: { fr: 'Générateur de QR codes', en: 'QR code generator' },
    description: { fr: 'Nuxt 4, 100 % côté client, interface FR/EN.', en: 'Nuxt 4, fully client-side, FR/EN interface.' },
    link: { url: 'https://github.com/kiri1101/qrcode-generator' },
  },
]
