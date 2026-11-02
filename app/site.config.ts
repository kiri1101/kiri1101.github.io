import { TURNSTILE_TEST_KEY } from "./lib/turnstile-key";
import { resolve, type Locale, type Localized } from "./i18n/locale";

export type Rgb = [number, number, number];

const bi = (fr: string, en: string): Localized<string> => ({ fr, en });
/** The same text in both languages: names, technologies and figures. */
const same = (text: string): Localized<string> => ({ fr: text, en: text });

/**
 * Jordan's real content, from the validated source in `legacy/content/*.ts` (profile, experience, education, skills,
 * method). Nothing here is written without that source; what Orbit needs and the source lacks is listed in
 * content/OPEN-QUESTIONS.md.
 */
const experience = [
  {
    from: 2023,
    to: null,
    role: bi("Lead Développeur Full Stack", "Lead Full Stack Developer"),
    organisation: "ADWA SARL",
    text: bi(
      "Plateformes nationales : e-gouvernement, transport, aviation, finance. Pilotage d’équipes de 3 à 6 développeurs.",
      "National platforms: e-government, transport, aviation, finance. Leading teams of 3–6 developers.",
    ),
  },
  {
    from: 2022,
    to: 2023,
    role: bi("Développeur Full Stack", "Full Stack Developer"),
    organisation: "VMEDIA CONSULTING",
    text: bi(
      "Produits SaaS clients ; intégrations GoHighLevel, Slack, Google Sheets, GoDaddy DNS.",
      "Client SaaS products; GoHighLevel, Slack, Google Sheets and GoDaddy DNS integrations.",
    ),
  },
  {
    from: 2020,
    to: 2022,
    role: bi("Développeur Full Stack", "Full Stack Developer"),
    organisation: "FORAMA",
    text: bi(
      "HAURIZON SHOP (e-commerce) et HAURIZON PAY (paiement SaaS).",
      "HAURIZON SHOP (e-commerce) and HAURIZON PAY (SaaS payments).",
    ),
  },
  {
    from: 2020,
    to: 2020,
    role: bi("Stagiaire informatique", "IT intern"),
    organisation: "HYDRAC",
    text: bi("Réseau, serveurs et outils internes.", "Network, servers and internal tools."),
  },
] satisfies { from: number; to: number | null; role: Localized<string>; organisation: string; text: Localized<string> }[];

const education = [
  {
    year: "2026",
    title: bi("BTech Génie Logiciel", "BTech in Software Engineering"),
    school: bi("IUG Douala · Université de Bamenda", "IUG Douala · University of Bamenda"),
    notes: [bi("GPA 3,27/4", "GPA 3.27/4"), bi("60/60 crédits", "60/60 credits"), bi("diplôme en cours de délivrance", "degree being issued")],
  },
  {
    year: "2020",
    title: bi("BTech Génie Électrique & Électronique", "BTech in Electrical & Electronic Engineering"),
    school: bi("DIT Douala — option Télécommunications", "DIT Douala — Telecommunications"),
    notes: [],
  },
  {
    year: "2019",
    title: bi("HND Génie Électrique & Électronique", "HND in Electrical & Electronic Engineering"),
    school: bi("IUC Douala — option Télécommunications", "IUC Douala — Telecommunications"),
    notes: [],
  },
] satisfies { year: string; title: Localized<string>; school: Localized<string>; notes: Localized<string>[] }[];

const skills = [
  {
    title: bi("Cœur de métier", "Core"),
    items: [
      same("Laravel / PHP 8"), same("Vue.js 3 / Nuxt 4"), same("React / Next.js"), same("TypeScript"),
      bi("API RESTful", "RESTful APIs"), same("MySQL / PostgreSQL"),
      same("Tests (Pest, Vitest, Playwright)"), same("Docker · CI/CD"),
    ],
  },
  {
    title: bi("Également pratiqué", "Also practised"),
    items: [
      same("Python (Flask)"), bi("Android avec Quasar", "Android with Quasar"), same("Tauri · Electron"), same("Redis"),
      same("Tailwind CSS · PrimeVue"), same("Mobile Money · SMS · ERP"),
      bi("Flutter (projets antérieurs)", "Flutter (earlier projects)"),
      bi("MongoDB (projets personnels)", "MongoDB (personal projects)"),
    ],
  },
  { title: bi("Notions", "Familiar with"), items: [same("Kotlin"), same("Java"), same("Rust"), same("Angular"), same("NestJS")] },
] satisfies { title: Localized<string>; items: Localized<string>[] }[];

const method = [
  {
    title: bi("Tests automatisés", "Automated testing"),
    text: bi(
      "Pest, PHPUnit, Vitest, Playwright : plus de 2 000 tests sur mes projets récents.",
      "Pest, PHPUnit, Vitest, Playwright: more than 2,000 tests across my recent projects.",
    ),
  },
  {
    title: bi("Intégration continue", "Continuous integration"),
    text: bi(
      "GitHub Actions, Bitbucket Pipelines, Docker : chaque changement vérifié avant la production.",
      "GitHub Actions, Bitbucket Pipelines, Docker: every change checked before production.",
    ),
  },
  {
    title: bi("Documentation", "Documentation"),
    text: bi(
      "Guides, ADR, contrats d’API : un code que l’équipe suivante peut reprendre.",
      "Guides, ADRs, API contracts: code the next team can pick up.",
    ),
  },
  {
    title: bi("Lead Agile", "Agile leadership"),
    text: bi(
      "Équipes de 3 à 6 développeurs ; Jira, Trello, Notion ; revues de code.",
      "Teams of 3–6 developers; Jira, Trello, Notion; code reviews.",
    ),
  },
  {
    title: bi("Sécurité", "Security"),
    text: bi(
      "Contrôle d’accès par rôles, OTP, documents signés (HMAC), secrets hors du code.",
      "Role-based access control, OTP, signed documents (HMAC), secrets kept out of code.",
    ),
  },
] satisfies { title: Localized<string>; text: Localized<string> }[];

const sectors = [
  bi("Secteur public", "Public sector"),
  bi("Transport", "Transport"),
  bi("Aviation", "Aviation"),
  bi("Banque & finance", "Banking & finance"),
  bi("Douanes & commerce", "Customs & trade"),
  bi("Paiements", "Payments"),
  bi("Éducation", "Education"),
  bi("ONG", "NGOs"),
  bi("Immobilier", "Real estate"),
  bi("Médias", "Media"),
] satisfies Localized<string>[];

const deliveredFor = [
  same("CAMRAIL"),
  bi("Port Autonome de Douala", "Port of Douala"),
  bi("Autorité Aéronautique du Cameroun", "Cameroon Civil Aviation Authority"),
  bi("Ministère des Finances", "Ministry of Finance"),
  bi("Ministère de la Fonction Publique", "Ministry of Public Service"),
  same("CAMCIS"),
  same("SWAA Littoral"),
] satisfies Localized<string>[];

/** The four figures. Years and sectors are computed (from the earliest role and the sector list), never typed twice. */
const stats = [
  {
    value: (year: number) => `${year - Math.min(...experience.map((e) => e.from))}+`,
    label: bi("Ans d’expérience", "Years of experience"),
    caption: bi("en production depuis 2020", "shipping to production since 2020"),
  },
  { value: same("3–6"), label: bi("Développeurs encadrés", "Developers led"), caption: bi("lead technique chez ADWA", "technical lead at ADWA") },
  { value: bi("2 000+", "2,000+"), label: bi("Tests automatisés", "Automated tests"), caption: bi("sur mes projets récents", "across my recent projects") },
  { value: same(String(sectors.length)), label: bi("Secteurs", "Sectors"), caption: bi("public, transport, aviation, banque…", "public sector, transport, aviation, banking…") },
] satisfies { value: Localized<string> | ((year: number) => string); label: Localized<string>; caption: Localized<string> }[];

const UNITS = { fr: { one: "an", many: "ans" }, en: { one: "year", many: "years" } } as const;

/** Whole years since the earliest role began, as the About page states them: "6 years", "6 ans". */
export function experienceYears(year: number, locale: Locale): string {
  const years = year - Math.min(...experience.map((e) => e.from));
  return `${years} ${years === 1 ? UNITS[locale].one : UNITS[locale].many}`;
}

export const site = {
  /**
   * Where the site is served, for the canonical and Open Graph URLs (which must be absolute) and the sitemap.
   * No trailing slash: paths are appended to it.
   */
  origin: "https://jordan-tukum.pages.dev",
  owner: {
    name: "Jordan Tukum Folem",
    role: bi("Développeur Full Stack Web & Mobile", "Full Stack Web & Mobile Developer"),
    location: bi("Douala, Cameroun", "Douala, Cameroon"),
    email: "jtukum@outlook.com",
    phone: "+237 698 377 389",
  },
  hero: {
    headline: [bi("Développeur Full Stack", "Full Stack Developer"), bi("Web & Mobile", "Web & Mobile")],
    sub: bi(
      "Lead Développeur Full Stack chez ADWA SARL. Basé à Douala, Cameroun.",
      "Lead Full Stack Developer at ADWA SARL. Based in Douala, Cameroon.",
    ),
    aside: {
      lead: bi(
        "Je conçois, teste et mets en production des plateformes web et mobiles — dont plusieurs à l’échelle nationale, ",
        "I design, test and ship web and mobile platforms — several of them at national scale, ",
      ),
      dim: bi(
        "pour des ministères, la CAMRAIL, le Port Autonome de Douala et l’Autorité Aéronautique du Cameroun.",
        "for government ministries, CAMRAIL, the Port of Douala and the Cameroon Civil Aviation Authority.",
      ),
    },
  },
  /** Orb stages in order: sphere, monogram, ring. Each is [inner glow, frost tint] as 0..1 RGB. */
  palette: [
    { name: "sphere", core: [1.0, 0.56, 0.3], frost: [1.0, 0.88, 0.8] },
    { name: "monogram", core: [0.33, 0.62, 1.0], frost: [0.82, 0.91, 1.0] },
    { name: "ring", core: [0.66, 0.46, 1.0], frost: [0.9, 0.86, 1.0] },
  ] satisfies { name: string; core: Rgb; frost: Rgb }[],
  /** The hero's pills: the first three sectors, then a "+" for the rest. */
  services: [sectors[0], sectors[1], sectors[2], same("+")],
  /** The direct line: WhatsApp, in the contact section's second row (its number shows beside the label). */
  call: { label: bi("Écrire sur WhatsApp", "Message on WhatsApp"), url: "https://wa.me/237698377389" },
  socials: [
    { label: "LinkedIn", url: "https://linkedin.com/in/jordan-tukum-811017137" },
    { label: "GitHub", url: "https://github.com/kiri1101" },
  ],
  /** The CV, one PDF per language (public/cv). */
  cv: {
    fr: "/cv/CV_Jordan_TUKUM_FOLEM_FR.pdf",
    en: "/cv/CV_Jordan_TUKUM_FOLEM_EN.pdf",
  },
  /** The label every "Let's talk" link uses. */
  cta: { label: bi("Parlons-en", "Let's talk") },
  outro: { heading: bi("Un projet en tête ?", "Have a project in mind?") },
  about: {
    statement: {
      lead: bi(
        "Je conçois, teste et mets en production des plateformes web et mobiles,",
        "I design, test and ship web and mobile platforms,",
      ),
      span: bi("dont plusieurs à l’échelle nationale.", "several of them at national scale."),
    },
    facts: [
      { term: bi("Basé à", "Based in"), value: bi("Douala, Cameroun", "Douala, Cameroon") },
      /** A function value is computed from the build year and the language (see `experienceYears`). */
      { term: bi("Expérience", "Experience"), value: experienceYears },
      {
        term: bi("Poste actuel", "Current role"),
        value: bi("Lead Développeur Full Stack, ADWA SARL", "Lead Full Stack Developer, ADWA SARL"),
      },
      { term: bi("Cœur de stack", "Core stack"), value: same("Laravel · Vue.js / Nuxt · React · TypeScript") },
      { term: bi("Équipes", "Teams"), value: bi("Lead de 3 à 6 développeurs, en Agile", "Lead of 3–6 developers, Agile") },
      { term: bi("Langues", "Languages"), value: bi("Français · Anglais (bilingue)", "French · English (bilingual)") },
      {
        term: bi("Distinction", "Distinction"),
        value: bi(
          "Délégué officiel de la CCAA — AFI Aviation Week 2025, Victoria Falls (Zimbabwe)",
          "Official CCAA delegate — AFI Aviation Week 2025, Victoria Falls (Zimbabwe)",
        ),
      },
    ],
    stats,
    method,
    /** `to: null` means "now". */
    experience,
    education,
    skills,
    sectors,
    deliveredFor,
  },
  /** The deep field's licence-style credit: the same in both languages, and pinned by a test. */
  imageCredit: "Webb's First Deep Field · NASA, ESA, CSA, STScI",
  /**
   * The contact form's Turnstile widget. The default is Cloudflare's always-pass test key (dev and tests); the real site key
   * is public and goes in VITE_TURNSTILE_SITE_KEY at build time; a Pages build fails without it (app/lib/turnstile-key.ts). The secret is a Pages secret, never here.
   */
  contact: {
    turnstileSiteKey: (import.meta.env?.VITE_TURNSTILE_SITE_KEY as string | undefined) || TURNSTILE_TEST_KEY,
    lead: bi("Parlez-moi du problème que vous cherchez à résoudre.", "Tell me about the problem you're solving."),
    note: bi("Votre message arrive directement dans ma boîte.", "Your message goes straight to my inbox."),
    placeholders: {
      name: bi("Votre nom", "Your name"),
      email: bi("vous@entreprise.com", "you@company.com"),
      message: bi("Que construisez-vous, et où êtes-vous bloqué ?", "What are you building, and where are you stuck?"),
    },
  },
} as const;

/** `site` read in one language: every `{ fr, en }` replaced by its side. Built once per language. */
const resolved: Partial<Record<Locale, ReturnType<typeof resolveSite>>> = {};
const resolveSite = (locale: Locale) => resolve(site, locale);
export const siteIn = (locale: Locale) => (resolved[locale] ??= resolveSite(locale));

/** The first two initials: the orb draws a two-letter monogram, so a third name ("Jordan Tukum Folem") adds none. */
export function monogramOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function formatYears(from: number, to: number | null, now: string): string {
  if (from === to) return String(from);
  return `${from} – ${to ?? now}`;
}
