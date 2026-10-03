import type { MethodItem } from './types'

export const method: MethodItem[] = [
  {
    icon: 'check',
    title: { fr: 'Tests automatisés', en: 'Automated testing' },
    text: { fr: 'Pest, PHPUnit, Vitest, Playwright : plus de 2 000 tests sur mes projets récents.', en: 'Pest, PHPUnit, Vitest, Playwright: more than 2,000 tests across my recent projects.' },
    short: { fr: 'Plus de 2 000 tests sur mes projets récents.', en: 'More than 2,000 tests across recent projects.' },
  },
  {
    icon: 'refresh',
    title: { fr: 'Intégration continue', en: 'Continuous integration' },
    text: { fr: 'GitHub Actions, Bitbucket Pipelines, Docker : chaque changement vérifié avant la production.', en: 'GitHub Actions, Bitbucket Pipelines, Docker: every change checked before production.' },
    short: { fr: 'Chaque changement vérifié avant la production.', en: 'Every change checked before production.' },
  },
  {
    icon: 'file',
    title: { fr: 'Documentation', en: 'Documentation' },
    text: { fr: 'Guides, ADR, contrats d’API : un code que l’équipe suivante peut reprendre.', en: 'Guides, ADRs, API contracts: code the next team can pick up.' },
    short: { fr: 'Guides, ADR et contrats d’API.', en: 'Guides, ADRs and API contracts.' },
  },
  {
    icon: 'users',
    title: { fr: 'Lead Agile', en: 'Agile leadership' },
    text: { fr: 'Équipes de 3 à 6 développeurs ; Jira, Trello, Notion ; revues de code.', en: 'Teams of 3–6 developers; Jira, Trello, Notion; code reviews.' },
    short: { fr: 'Équipes de 3 à 6 ; Jira, Trello, Notion.', en: 'Teams of 3–6; Jira, Trello, Notion.' },
  },
  {
    icon: 'shield',
    title: { fr: 'Sécurité', en: 'Security' },
    text: { fr: 'Contrôle d’accès par rôles, OTP, documents signés (HMAC), secrets hors du code.', en: 'Role-based access control, OTP, signed documents (HMAC), secrets kept out of code.' },
    short: { fr: 'Rôles, OTP, documents signés (HMAC).', en: 'Roles, OTP, signed documents (HMAC).' },
  },
]
