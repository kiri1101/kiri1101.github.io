import type { EducationItem } from './types'

export const education: EducationItem[] = [
  {
    title: { fr: 'BTech Génie Logiciel', en: 'BTech in Software Engineering' },
    school: { fr: 'IUG Douala · Université de Bamenda', en: 'IUG Douala · University of Bamenda' },
    year: '2026',
    badges: [
      { tone: 'proof', label: { fr: 'GPA 3,27/4', en: 'GPA 3.27/4' } },
      { tone: 'proof', label: { fr: '60/60 crédits', en: '60/60 credits' } },
      { tone: 'plain', label: { fr: 'diplôme en cours de délivrance', en: 'degree being issued' } },
    ],
  },
  {
    title: { fr: 'BTech Génie Électrique & Électronique', en: 'BTech in Electrical & Electronic Engineering' },
    school: { fr: 'DIT Douala — option Télécommunications', en: 'DIT Douala — Telecommunications' },
    year: '2020',
    badges: [],
  },
  {
    title: { fr: 'HND Génie Électrique & Électronique', en: 'HND in Electrical & Electronic Engineering' },
    school: { fr: 'IUC Douala — option Télécommunications', en: 'IUC Douala — Telecommunications' },
    year: '2019',
    badges: [],
  },
]
