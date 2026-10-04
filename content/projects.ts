import type { Localized, Project } from './types'

const same = (text: string): Localized => ({ fr: text, en: text })
const lead: Localized = { fr: 'Lead développeur', en: 'Lead developer' }
const designDev: Localized = { fr: 'Conception & développement', en: 'Design & development' }

export const projects: Project[] = [
  {
    slug: 'services-publics',
    number: '01',
    featured: true,
    sector: { fr: 'Secteur public · E-gouvernement', en: 'Public sector · E-government' },
    title: same('SERVICES PUBLICS'),
    summary: {
      fr: 'Le portail national qui centralise les démarches administratives et la collecte des recettes non fiscales : comptes usagers avec OTP, déclarations et pièces justificatives, paiements en ligne.',
      en: 'The national portal for administrative procedures and non-tax revenue collection: user accounts with OTP, declarations with supporting documents, online payments.',
    },
    role: lead,
    period: { fr: '2023 — aujourd’hui', en: '2023 — present' },
    organisation: {
      fr: 'Ministère des Finances — Direction Générale du Budget · réalisé chez ADWA SARL',
      en: 'Ministry of Finance — Directorate General of Budget · delivered at ADWA SARL',
    },
    stack: ['Laravel', 'Vue 3', 'Inertia (SSR)', 'Laravel Echo', 'Docker'],
    badges: [
      { tone: 'live', label: { fr: 'En ligne', en: 'Live' } },
      { tone: 'proof', label: same('≈ 900 commits') },
    ],
    links: [{ kind: 'live', url: 'https://services-publics.cm/services/publics', label: 'services-publics.cm' }],
    image: {
      kind: 'screenshot',
      src: '/img/services-publics.webp',
      alt: { fr: 'Page d’accueil du portail SERVICES PUBLICS', en: 'SERVICES PUBLICS portal home page' },
      url: 'https://services-publics.cm/services/publics',
      position: 'top',
    },
    context: {
      fr: 'Les démarches administratives et la collecte des recettes non fiscales relèvent de nombreux ministères. SERVICES PUBLICS, plateforme du Ministère des Finances, les rassemble dans un portail unique où l’usager crée son compte, constitue son dossier et règle ses frais en ligne.',
      en: 'Administrative procedures and non-tax revenue collection span many ministries. SERVICES PUBLICS, a Ministry of Finance platform, brings them into a single portal where users create an account, build their file and pay their fees online.',
    },
    contribution: [
      {
        fr: 'Lead développeur du front-office et du back-office — principal contributeur, avec environ 90 % des quelque 900 commits depuis 2023.',
        en: 'Lead developer of the front office and back office — main contributor, with about 90% of the roughly 900 commits since 2023.',
      },
      {
        fr: 'Parcours usager complet : inscription, authentification par OTP, consultation des services, déclarations avec pièces justificatives, paiement en ligne ou bancaire.',
        en: 'End-to-end user journey: sign-up, OTP authentication, service catalogue, declarations with supporting documents, online or bank payment.',
      },
      {
        fr: 'Rendu côté serveur (SSR) pour un premier affichage rapide et un bon référencement.',
        en: 'Server-side rendering (SSR) for a fast first paint and good search visibility.',
      },
    ],
    architecture: [
      { label: { fr: 'Navigateur', en: 'Browser' }, description: { fr: 'Vue 3 + Inertia, rendu serveur (SSR)', en: 'Vue 3 + Inertia, server-side rendered' } },
      { label: same('Routes'), description: { fr: 'Espaces séparés : public, usager authentifié, authentification, paiements', en: 'Separate areas: public, signed-in user, authentication, payments' } },
      { label: { fr: 'Métier', en: 'Business logic' }, description: { fr: 'Classes Action à responsabilité unique · middlewares d’authentification, de journalisation et de contrôle des téléversements', en: 'Single-responsibility Action classes · middleware for authentication, logging and upload checks' } },
      { label: same('Services'), description: { fr: 'Paiement en ligne et bancaire · stockage des pièces · notifications temps réel', en: 'Online and bank payment · document storage · real-time notifications' } },
    ],
    keyDecision: {
      fr: 'Isoler la logique métier dans des classes Action plutôt que dans les contrôleurs, pour la tester et la réutiliser entre les parcours.',
      en: 'Keep business logic in Action classes rather than controllers, so it can be tested and reused across user journeys.',
    },
    quality: [
      { value: same('≈ 900'), label: { fr: 'Commits depuis 2023', en: 'Commits since 2023' } },
      { value: same('3'), label: { fr: 'Environnements : test, pré-production, production', en: 'Environments: test, pre-production, production' } },
      { value: same('Docker'), label: { fr: 'Environnements conteneurisés', en: 'Containerised environments' } },
    ],
    result: { fr: 'En production sur services-publics.cm.', en: 'In production at services-publics.cm.' },
  },
  {
    slug: 'bornes-libre-service',
    number: '02',
    featured: true,
    sector: { fr: 'Transport · Bornes interactives', en: 'Transport · Self-service kiosks' },
    title: { fr: 'Bornes en libre-service', en: 'Self-service kiosks' },
    summary: {
      fr: 'La billetterie CAMRAIL sur bornes interactives en gares de Douala et Yaoundé, puis une borne multiservices pour un transporteur interurbain : imprimante thermique, lecteur QR et scanner de pièces d’identité.',
      en: 'CAMRAIL ticketing on interactive kiosks in Douala and Yaoundé stations, then a multi-service kiosk for an intercity bus operator: thermal printer, QR reader and ID-document scanner.',
    },
    role: lead,
    period: { fr: '2023 — aujourd’hui', en: '2023 — present' },
    organisation: {
      fr: 'CAMRAIL et un transporteur interurbain · réalisé chez ADWA SARL',
      en: 'CAMRAIL and an intercity bus operator · delivered at ADWA SARL',
    },
    stack: ['Tauri 2', 'Nuxt 4', 'Nitro', 'Laravel', 'Inertia'],
    badges: [
      { tone: 'live', label: { fr: 'CAMRAIL : déployé en gares', en: 'CAMRAIL: deployed in stations' } },
      { tone: 'proof', label: { fr: 'Matériel + logiciel', en: 'Hardware + software' } },
    ],
    links: [],
    image: { kind: 'kiosk' },
    context: {
      fr: 'Acheter un billet de train ou de bus suppose souvent de faire la queue au guichet. Les bornes en libre-service permettent de rechercher un trajet, de payer et d’imprimer son billet sans agent.',
      en: 'Buying a train or bus ticket usually means queuing at a counter. Self-service kiosks let travellers search a trip, pay and print their ticket without an agent.',
    },
    contribution: [
      {
        fr: 'Billetterie CAMRAIL : application web de vente de billets déployée sur des bornes interactives dans les gares de Douala et Yaoundé.',
        en: 'CAMRAIL ticketing: a web ticket-sales application deployed on interactive kiosks in Douala and Yaoundé stations.',
      },
      {
        fr: 'Borne multiservices : seul développeur du client borne (Tauri 2 + Nuxt 4) et de l’API façade (Nuxt / Nitro) qui le relie à l’ERP du transporteur.',
        en: 'Multi-service kiosk: sole developer of the kiosk client (Tauri 2 + Nuxt 4) and of the façade API (Nuxt / Nitro) that connects it to the operator’s ERP.',
      },
      {
        fr: 'Pilotage des périphériques : imprimante thermique, lecteur de QR codes, scanner de passeports et de pièces d’identité.',
        en: 'Peripheral control: thermal printer, QR-code reader, passport and ID-document scanner.',
      },
    ],
    architecture: [
      { label: { fr: 'Borne', en: 'Kiosk' }, description: { fr: 'Application Windows verrouillée : Tauri 2 + Nuxt 4, écran 1280 × 1024', en: 'Locked-down Windows app: Tauri 2 + Nuxt 4, 1280 × 1024 screen' } },
      { label: { fr: 'Périphériques', en: 'Peripherals' }, description: { fr: 'Imprimante thermique, lecteur QR, scanner d’identité via un module natif Tauri', en: 'Thermal printer, QR reader, ID scanner through a native Tauri sidecar' } },
      { label: { fr: 'Façade', en: 'Façade' }, description: { fr: 'Service hébergé Nuxt / Nitro qui détient les identifiants et adapte les réponses de l’ERP', en: 'Hosted Nuxt / Nitro service that holds the credentials and reshapes ERP responses' } },
      { label: same('ERP'), description: { fr: 'Tarifs, places disponibles et émission des billets côté transporteur', en: 'Fares, seat availability and ticket issuance on the operator side' } },
    ],
    keyDecision: {
      fr: 'Faire de la borne un client léger : aucun identifiant, aucun tarif et aucune donnée persistée sur la machine. Tout passe par la façade hébergée, ce qui limite l’impact d’une borne compromise.',
      en: 'Make the kiosk a thin client: no credentials, no fares and no persisted data on the machine. Everything goes through the hosted façade, which limits the damage a compromised kiosk could do.',
    },
    quality: [
      { value: same('150+'), label: { fr: 'Commits sur le client borne', en: 'Commits on the kiosk client' } },
      { value: same('OpenSpec'), label: { fr: 'Spécification exécutable et journal des décisions', en: 'Executable specification and decision log' } },
      { value: same('0'), label: { fr: 'Donnée stockée sur la borne', en: 'Data stored on the kiosk' } },
    ],
    result: {
      fr: 'Billetterie CAMRAIL en service sur bornes en gares de Douala et Yaoundé ; borne multiservices en préparation pour un pilote de deux bornes sur l’axe Douala–Yaoundé.',
      en: 'CAMRAIL ticketing running on kiosks in Douala and Yaoundé stations; the multi-service kiosk is being prepared for a two-kiosk pilot on the Douala–Yaoundé route.',
    },
  },
  {
    slug: 'ministere-fonction-publique',
    number: '03',
    featured: false,
    sector: { fr: 'Secteur public · Procédures', en: 'Public sector · Procedures' },
    title: { fr: 'Ministère de la Fonction Publique', en: 'Ministry of Public Service' },
    summary: {
      fr: 'Plateforme de référence des procédures administratives : étapes, pièces requises et contacts de chaque service public.',
      en: 'Reference platform for administrative procedures: steps, required documents and contacts for every public service.',
    },
    role: lead,
    period: same('2025 — 2026'),
    organisation: {
      fr: 'Ministère de la Fonction Publique et de la Réforme Administrative · réalisé chez ADWA SARL',
      en: 'Ministry of Public Service and Administrative Reform · delivered at ADWA SARL',
    },
    stack: ['Laravel 12', 'Sanctum', 'Pest', 'React', 'TypeScript'],
    badges: [
      { tone: 'proof', label: same('280+ tests') },
      { tone: 'proof', label: { fr: 'Contrat d’API testé', en: 'Tested API contract' } },
    ],
    links: [{ kind: 'live', url: 'https://servicepublic.gov.cm', label: 'servicepublic.gov.cm' }],
    image: { kind: 'none' },
    testCount: 282,
    context: {
      fr: 'Pour chaque service public, l’usager doit savoir quelles étapes suivre, quelles pièces fournir et qui contacter. La plateforme centralise ces informations et permet à l’administration de les tenir à jour.',
      en: 'For every public service, citizens need to know which steps to follow, which documents to provide and whom to contact. The platform centralises this information and lets the administration keep it up to date.',
    },
    contribution: [
      {
        fr: 'Lead développeur de l’API Laravel et de l’interface React / TypeScript.',
        en: 'Lead developer of the Laravel API and the React / TypeScript interface.',
      },
      {
        fr: 'Contrôle d’accès en quatre niveaux (public, usager, administrateur, super-administrateur), validation systématique par Form Requests, limitation de débit et cache HTTP (ETag) sur les routes exposées.',
        en: 'Four-level access control (public, citizen, admin, super-admin), systematic Form Request validation, rate limiting and HTTP caching (ETag) on exposed routes.',
      },
      {
        fr: 'Migration vers Laravel 12, revues de code, audits et registre de remédiation documentés.',
        en: 'Upgrade to Laravel 12, code reviews, audits and a documented remediation log.',
      },
    ],
    architecture: [
      { label: same('Client'), description: { fr: 'Application React 18 + TypeScript', en: 'React 18 + TypeScript application' } },
      { label: same('API'), description: { fr: 'Laravel 12, authentification Sanctum, une Form Request par route', en: 'Laravel 12, Sanctum authentication, one Form Request per route' } },
      { label: { fr: 'Accès', en: 'Access' }, description: { fr: 'Quatre niveaux : public, usager, administrateur, super-administrateur', en: 'Four levels: public, citizen, admin, super-admin' } },
      { label: { fr: 'Contrat', en: 'Contract' }, description: { fr: 'Référence des routes générée depuis le code (php artisan docs:routes)', en: 'Route reference generated from the code (php artisan docs:routes)' } },
    ],
    keyDecision: {
      fr: 'Générer la référence des routes depuis le code et faire échouer la suite de tests si elle n’est plus à jour : le client et l’API ne peuvent plus diverger en silence.',
      en: 'Generate the route reference from the code and fail the test suite when it is stale: the client and the API can no longer drift apart silently.',
    },
    quality: [
      { value: same('280+'), label: { fr: 'Tests Pest', en: 'Pest tests' } },
      { value: same('ADR'), label: { fr: 'Décisions d’architecture documentées', en: 'Documented architecture decisions' } },
      { value: same('12'), label: { fr: 'Version de Laravel après migration', en: 'Laravel version after upgrade' } },
    ],
    result: {
      fr: 'Une API documentée, sécurisée par rôles et couverte par plus de 280 tests, avec un contrat que le client peut suivre sans surprise.',
      en: 'A documented, role-secured API covered by more than 280 tests, with a contract the client can rely on.',
    },
  },
  {
    slug: 'conformite-bancaire',
    number: '04',
    featured: false,
    sector: { fr: 'Finance · Conformité', en: 'Finance · Compliance' },
    title: { fr: 'Conformité bancaire', en: 'Banking compliance' },
    summary: {
      fr: 'Collecte, contrôle et suivi de la documentation clients exigée des banques pour les transferts internationaux.',
      en: 'Collecting, checking and tracking the client documentation banks must hold for international transfers.',
    },
    role: lead,
    period: { fr: 'déc. 2025 — 2026', en: 'Dec 2025 — 2026' },
    organisation: {
      fr: 'Secteur bancaire de la zone CEMAC · réalisé chez ADWA SARL',
      en: 'Banking sector, CEMAC zone · delivered at ADWA SARL',
    },
    stack: ['Nuxt 4', 'TypeScript', 'Zod', 'PrimeVue', 'Vitest'],
    badges: [
      { tone: 'proof', label: same('180+ tests') },
      { tone: 'proof', label: { fr: 'Zone CEMAC', en: 'CEMAC zone' } },
    ],
    links: [],
    image: { kind: 'none' },
    testCount: 181,
    context: {
      fr: 'Dans la zone CEMAC, chaque transfert international doit être justifié par une documentation client complète et à jour. Lors des audits, une banque incapable de la produire s’expose à de lourdes sanctions.',
      en: 'In the CEMAC zone, every international transfer must be backed by complete, up-to-date client documentation. During audits, a bank that cannot produce it faces heavy penalties.',
    },
    contribution: [
      {
        fr: 'Lead développeur du front-end Nuxt 4, organisé en Backend-for-Frontend : les routes serveur Nuxt dialoguent avec l’API et le navigateur ne voit jamais les secrets.',
        en: 'Lead developer of the Nuxt 4 front end, built as a Backend-for-Frontend: Nuxt server routes talk to the API, so the browser never sees secrets.',
      },
      {
        fr: 'Formulaires dynamiques validés par Zod, téléversement des pièces, interface bilingue.',
        en: 'Dynamic forms validated with Zod, document uploads, bilingual interface.',
      },
      {
        fr: 'Mise en place de la suite de tests Vitest et de la vérification de types comme garde-fou à chaque changement.',
        en: 'Set up the Vitest suite and type checking as a gate on every change.',
      },
    ],
    architecture: [
      { label: { fr: 'Navigateur', en: 'Browser' }, description: { fr: 'Pages Nuxt 4 + PrimeVue, formulaires dynamiques', en: 'Nuxt 4 pages + PrimeVue, dynamic forms' } },
      { label: same('BFF'), description: { fr: 'Routes serveur Nuxt (Nitro) : session, appels API, normalisation des erreurs', en: 'Nuxt (Nitro) server routes: session, API calls, error normalisation' } },
      { label: same('Validation'), description: { fr: 'Schémas Zod et utilitaires de validation côté serveur', en: 'Zod schemas and validation utilities on the server' } },
      { label: { fr: 'Logique', en: 'Logic' }, description: { fr: 'Décisions métier extraites en fonctions pures testées', en: 'Business decisions extracted into tested pure functions' } },
    ],
    keyDecision: {
      fr: 'Extraire les décisions des pages — quelle route ouvrir, quel mode d’affichage, quel champ verrouiller — dans des fonctions pures testées : la logique métier est couverte sans navigateur.',
      en: 'Extract page decisions — which route to open, which display mode, which field to lock — into tested pure functions, so business logic is covered without a browser.',
    },
    quality: [
      { value: same('180+'), label: { fr: 'Tests Vitest', en: 'Vitest tests' } },
      { value: same('0'), label: { fr: 'Erreur de typage (nuxt typecheck)', en: 'Type errors (nuxt typecheck)' } },
      { value: same('BFF'), label: { fr: 'Secrets gardés côté serveur', en: 'Secrets kept server-side' } },
    ],
    result: {
      fr: 'Une application qui guide les équipes bancaires dans la constitution et la mise à jour des dossiers exigés lors des audits.',
      en: 'An application that guides bank staff in building and updating the files auditors require.',
    },
  },
  {
    slug: 'equip4safety',
    number: '05',
    featured: false,
    sector: { fr: 'Aviation · Marketplace B2B', en: 'Aviation · B2B marketplace' },
    title: same('EQUIP4SAFETY'),
    summary: {
      fr: 'Marketplace d’équipements aéronautiques entre États membres de l’OACI, commanditée par l’Autorité Aéronautique du Cameroun.',
      en: 'Aviation equipment marketplace for ICAO member states, commissioned by the Cameroon Civil Aviation Authority.',
    },
    role: { fr: 'Pilotage technique & coordination', en: 'Technical lead & coordination' },
    period: same('2025 — 2026'),
    organisation: {
      fr: 'Autorité Aéronautique du Cameroun (CCAA) · réalisé chez ADWA SARL',
      en: 'Cameroon Civil Aviation Authority (CCAA) · delivered at ADWA SARL',
    },
    stack: ['Laravel 12', 'Sanctum', 'Next.js 15', 'React 19', 'next-intl'],
    badges: [
      { tone: 'live', label: { fr: 'Démo en ligne', en: 'Live demo' } },
      { tone: 'proof', label: { fr: 'OACI / CCAA', en: 'ICAO / CCAA' } },
    ],
    links: [{ kind: 'demo', url: 'https://demo.equip4safety.org/marketplace', label: 'demo.equip4safety.org' }],
    image: {
      kind: 'screenshot',
      src: '/img/equip4safety.webp',
      alt: {
        fr: 'Marketplace EQUIP4SAFETY : équipements vérifiés publiés par l’Autorité Aéronautique du Cameroun',
        en: 'EQUIP4SAFETY marketplace: verified equipment listed by the Cameroon Civil Aviation Authority',
      },
      url: 'https://demo.equip4safety.org/marketplace',
      position: 'center 62%',
    },
    context: {
      fr: 'Les autorités et opérateurs aéronautiques disposent d’équipements — balisage, véhicules d’intervention, radio — qu’ils pourraient vendre, louer ou échanger. EQUIP4SAFETY leur offre une place de marché commune, avec des fournisseurs vérifiés.',
      en: 'Aviation authorities and operators hold equipment — airfield lighting, rescue vehicles, radio — that they could sell, lease or exchange. EQUIP4SAFETY gives them a shared marketplace with verified suppliers.',
    },
    contribution: [
      {
        fr: 'Pilotage technique du projet et coordination de l’équipe de développement.',
        en: 'Technical lead of the project and coordination of the development team.',
      },
      {
        fr: 'Contributions à l’API Laravel et au front-end Next.js.',
        en: 'Contributions to the Laravel API and the Next.js front end.',
      },
      {
        fr: 'Représentation du projet au sein de la délégation officielle de la CCAA à l’AFI Aviation Week 2025, à Victoria Falls (Zimbabwe).',
        en: 'Represented the project within the CCAA’s official delegation at AFI Aviation Week 2025 in Victoria Falls, Zimbabwe.',
      },
    ],
    architecture: [
      { label: same('API'), description: { fr: 'Laravel 12 · authentification Sanctum · e-mails transactionnels SendGrid', en: 'Laravel 12 · Sanctum authentication · SendGrid transactional email' } },
      { label: { fr: 'Interface', en: 'Front end' }, description: { fr: 'Next.js 15 / React 19, interface multilingue (next-intl)', en: 'Next.js 15 / React 19, multilingual interface (next-intl)' } },
      { label: same('Catalogue'), description: { fr: 'Annonces d’équipements, fournisseurs vérifiés, demandes de prix', en: 'Equipment listings, verified suppliers, requests for quotation' } },
    ],
    quality: [
      { value: { fr: 'Démo', en: 'Demo' }, label: { fr: 'Publique et en ligne', en: 'Public and online' } },
      { value: { fr: 'OACI', en: 'ICAO' }, label: { fr: 'États membres visés', en: 'Member states targeted' } },
      { value: same('2025'), label: { fr: 'Délégation CCAA à l’AFI Aviation Week', en: 'CCAA delegation at AFI Aviation Week' } },
    ],
    result: {
      fr: 'Démo publique en ligne sur demo.equip4safety.org ; projet représenté au sein de la délégation de la CCAA à l’AFI Aviation Week 2025.',
      en: 'Public demo live at demo.equip4safety.org; the project was represented within the CCAA delegation at AFI Aviation Week 2025.',
    },
  },
  {
    slug: 'tv-satellite',
    number: '06',
    featured: false,
    sector: { fr: 'Médias · Application mobile', en: 'Media · Mobile app' },
    title: { fr: 'Abonnements TV par satellite', en: 'Satellite TV subscriptions' },
    summary: {
      fr: 'Application Android, API mobile et back-office : abonnements, renouvellements, paiement Mobile Money et OTP par SMS.',
      en: 'Android app, mobile API and back office: subscriptions, renewals, Mobile Money payments and SMS OTP.',
    },
    role: { fr: 'Développeur principal', en: 'Main developer' },
    period: same('2024 — 2026'),
    organisation: {
      fr: 'Un opérateur de télévision par satellite · réalisé chez ADWA SARL',
      en: 'A satellite TV operator · delivered at ADWA SARL',
    },
    stack: ['Laravel 10', 'Inertia (SSR)', 'Vue 3', 'Quasar', 'MeSomb', 'Vonage'],
    badges: [
      { tone: 'proof', label: same('Android') },
      { tone: 'proof', label: same('Mobile Money') },
    ],
    links: [],
    image: { kind: 'none' },
    context: {
      fr: 'Les abonnés d’un opérateur de télévision par satellite doivent pouvoir souscrire, renouveler et payer depuis leur téléphone, tandis que l’équipe gère abonnements, commandes et support depuis un back-office.',
      en: 'Subscribers of a satellite TV operator need to subscribe, renew and pay from their phone, while staff manage subscriptions, orders and support from a back office.',
    },
    contribution: [
      {
        fr: 'Développeur principal du back-end Laravel, qui sert à la fois le back-office web et l’API mobile.',
        en: 'Main developer of the Laravel back end, which serves both the web back office and the mobile API.',
      },
      { fr: 'Application Android packagée avec Quasar.', en: 'Android app packaged with Quasar.' },
      {
        fr: 'Paiement Mobile Money via MeSomb, vérification par OTP envoyé par SMS, porte-monnaie et tickets de support.',
        en: 'Mobile Money payments through MeSomb, SMS OTP verification, wallet and support tickets.',
      },
    ],
    architecture: [
      { label: same('Mobile'), description: { fr: 'Application Android (Quasar) consommant l’API JSON', en: 'Android app (Quasar) consuming the JSON API' } },
      { label: { fr: 'Back-office', en: 'Back office' }, description: { fr: 'Laravel + Inertia / Vue 3 avec rendu serveur', en: 'Laravel + Inertia / Vue 3, server-side rendered' } },
      { label: same('API'), description: { fr: 'Enveloppe JSON commune pour toutes les réponses', en: 'One shared JSON envelope for every response' } },
      { label: same('Services'), description: { fr: 'MeSomb (Mobile Money) · Vonage (SMS / OTP)', en: 'MeSomb (Mobile Money) · Vonage (SMS / OTP)' } },
    ],
    keyDecision: {
      fr: 'Une seule base Laravel pour deux surfaces — back-office web et API mobile — avec un format de réponse unique, pour ne maintenir qu’un seul modèle métier.',
      en: 'One Laravel codebase for two surfaces — web back office and mobile API — with a single response format, so there is only one business model to maintain.',
    },
    quality: [
      { value: same('Android'), label: { fr: 'Application packagée avec Quasar', en: 'App packaged with Quasar' } },
      { value: same('XAF'), label: { fr: 'Paiements Mobile Money', en: 'Mobile Money payments' } },
      { value: same('SSR'), label: { fr: 'Back-office rendu côté serveur', en: 'Server-rendered back office' } },
    ],
    result: {
      fr: 'Abonnements, renouvellements et paiements gérés de bout en bout, du téléphone de l’abonné au back-office.',
      en: 'Subscriptions, renewals and payments handled end to end, from the subscriber’s phone to the back office.',
    },
  },
  {
    slug: 'schulyf',
    number: '07',
    featured: false,
    sector: { fr: 'Éducation · Projet indépendant', en: 'Education · Independent project' },
    title: same('SchuLyf'),
    summary: {
      fr: 'Gestion universitaire : admissions, reçus signés (HMAC) vérifiables en ligne, accès aux examens selon la situation financière.',
      en: 'University administration: admissions, HMAC-signed receipts verifiable online, exam access based on payment standing.',
    },
    role: designDev,
    period: { fr: 'avr. — juil. 2026', en: 'Apr — Jul 2026' },
    organisation: { fr: 'Projet indépendant pour les universités camerounaises', en: 'Independent project for Cameroonian universities' },
    stack: ['Laravel 13', 'Inertia', 'Vue 3', 'PrimeVue', 'Tailwind CSS', 'Pest'],
    badges: [
      { tone: 'live', label: { fr: 'Code public', en: 'Public code' } },
      { tone: 'proof', label: same('580+ tests') },
    ],
    links: [{ kind: 'code', url: 'https://github.com/kiri1101/student-management-system', label: 'github.com/kiri1101/student-management-system' }],
    image: { kind: 'none' },
    testCount: 584,
    context: {
      fr: 'Dans beaucoup d’universités, les admissions passent par des dossiers papier, les paiements par des reçus bancaires portés à la main et les annonces par le bouche-à-oreille. Un reçu perdu ou falsifié devient source de conflit.',
      en: 'In many universities, admissions run on paper files, payments on hand-carried bank slips and announcements on word of mouth. A lost or forged receipt becomes a source of dispute.',
    },
    contribution: [
      {
        fr: 'Conception et développement complets : modélisation, back-end, interface, tests et documentation.',
        en: 'Full design and development: data model, back end, interface, tests and documentation.',
      },
      {
        fr: 'Admissions en ligne triées par les agents de la scolarité ; l’admis devient étudiant.',
        en: 'Online admissions triaged by student-affairs officers; an admitted applicant becomes a student.',
      },
      {
        fr: 'Paiement par versements datés : situation financière calculée en temps réel, accès aux examens et reports gérés en conséquence.',
        en: 'Instalment payments: payment standing computed live, with exam access and deferrals handled accordingly.',
      },
    ],
    architecture: [
      { label: { fr: 'Interface', en: 'Interface' }, description: same('Inertia + Vue 3, PrimeVue, Tailwind CSS v4') },
      { label: same('Back-end'), description: { fr: 'Laravel 13, authentification Fortify, routes typées (Wayfinder)', en: 'Laravel 13, Fortify authentication, typed routes (Wayfinder)' } },
      { label: { fr: 'Reçus', en: 'Receipts' }, description: { fr: 'Reçu PDF unique signé HMAC + point de vérification public', en: 'Single HMAC-signed PDF receipt + public verification endpoint' } },
    ],
    keyDecision: {
      fr: 'Un reçu unique, signé par HMAC et vérifiable via un lien public : un reçu perdu ou falsifié n’est plus une source de litige.',
      en: 'One receipt, HMAC-signed and verifiable through a public link: a lost or forged receipt is no longer a source of dispute.',
    },
    quality: [
      { value: same('580+'), label: { fr: 'Tests Pest, dont tests navigateur', en: 'Pest tests, including browser tests' } },
      { value: same('50'), label: { fr: 'Pages de documentation', en: 'Documentation pages' } },
      { value: same('CI'), label: { fr: 'Lint et tests à chaque push', en: 'Lint and tests on every push' } },
    ],
    result: {
      fr: 'Code source public, documenté et testé, consultable sur GitHub.',
      en: 'Public, documented and tested source code, available on GitHub.',
    },
  },
  {
    slug: 'drymhome',
    number: '08',
    featured: false,
    sector: { fr: 'Immobilier · Projet indépendant', en: 'Real estate · Independent project' },
    title: same('DrymHome'),
    summary: {
      fr: 'Plateforme de location pour locataires et agents : API, notifications temps réel et push, applications Nuxt.',
      en: 'Rental platform for tenants and agents: API, real-time and push notifications, Nuxt apps.',
    },
    role: designDev,
    period: { fr: 'avr. 2026 — aujourd’hui', en: 'Apr 2026 — present' },
    organisation: { fr: 'Projet indépendant', en: 'Independent project' },
    stack: ['Laravel 13', 'Sanctum', 'Reverb', 'Web Push', 'S3', 'Nuxt 4'],
    badges: [
      { tone: 'proof', label: same('970+ tests') },
      { tone: 'proof', label: { fr: 'Temps réel', en: 'Real-time' } },
    ],
    links: [],
    image: { kind: 'none' },
    testCount: 977,
    context: {
      fr: 'Trouver un logement passe souvent par des intermédiaires difficiles à joindre. DrymHome met en relation locataires et agents immobiliers, avec des annonces et des notifications en temps réel.',
      en: 'Finding a home often depends on hard-to-reach intermediaries. DrymHome connects tenants and estate agents with listings and real-time notifications.',
    },
    contribution: [
      {
        fr: 'Conception et développement de l’API Laravel 13 et des applications Nuxt 4 (locataires et agents, back-office).',
        en: 'Designed and built the Laravel 13 API and the Nuxt 4 apps (tenants and agents, back office).',
      },
      {
        fr: 'Authentification par jeton et connexion sociale, notifications temps réel (Reverb) et push web, stockage des médias sur S3.',
        en: 'Token and social sign-in, real-time (Reverb) and web-push notifications, media storage on S3.',
      },
      {
        fr: 'Documentation d’API générée automatiquement depuis le code (Scramble).',
        en: 'API documentation generated automatically from the code (Scramble).',
      },
    ],
    architecture: [
      { label: same('Clients'), description: { fr: 'Deux applications Nuxt 4 : locataires et agents, back-office', en: 'Two Nuxt 4 apps: tenants and agents, back office' } },
      { label: same('API'), description: { fr: 'Laravel 13, Sanctum, Socialite, documentation Scramble', en: 'Laravel 13, Sanctum, Socialite, Scramble docs' } },
      { label: { fr: 'Temps réel', en: 'Real-time' }, description: { fr: 'Laravel Reverb (WebSockets) et Web Push', en: 'Laravel Reverb (WebSockets) and Web Push' } },
      { label: { fr: 'Médias', en: 'Media' }, description: { fr: 'Stockage S3, traitement d’images', en: 'S3 storage, image processing' } },
    ],
    quality: [
      { value: same('970+'), label: { fr: 'Tests Pest', en: 'Pest tests' } },
      { value: same('CI'), label: { fr: 'Tests automatiques à chaque push', en: 'Automated tests on every push' } },
      { value: same('API'), label: { fr: 'Documentation générée depuis le code', en: 'Documentation generated from code' } },
    ],
    result: {
      fr: 'En développement actif : une API largement testée et des applications Nuxt pour chaque profil d’utilisateur.',
      en: 'In active development: a thoroughly tested API and Nuxt apps for each type of user.',
    },
  },
]

export const projectSlugs: string[] = projects.map(p => p.slug)

export function getProject(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug)
}

export function neighbours(slug: string): { prev: string; next: string } {
  const index = projectSlugs.indexOf(slug)
  if (index === -1) throw new Error(`Unknown project: ${slug}`)
  const count = projectSlugs.length
  return { prev: projectSlugs[(index - 1 + count) % count]!, next: projectSlugs[(index + 1) % count]! }
}
