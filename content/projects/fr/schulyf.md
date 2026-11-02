---
slug: schulyf
title: "SchuLyf"
year: 2026
discipline: "Éducation"
category: "Éducation · Projet indépendant"
summary: "Gestion universitaire : admissions, reçus signés (HMAC) vérifiables en ligne, accès aux examens selon la situation financière."
role: "Conception & développement"
timeline: "avr. — juil. 2026"
team: "Projet indépendant pour les universités camerounaises"
platforms: "Laravel 13, Inertia, Vue 3, PrimeVue, Tailwind CSS, Pest"
order: 7
featured: false
illustrative: true
accent:
  from: "#101426"
  to: "#252d5c"
cover:
  src: /projects/schulyf/cover.avif
  width: 1600
  height: 1200
  alt: "Maquette illustrative : le tableau des admissions, avec les candidatures classées en reçues, en examen et admises, au-dessus d’un tableau des tranches de paiement et de l’accès aux examens."
stats:
  - value: "580+"
    label: "Tests Pest, dont tests navigateur"
  - value: "50"
    label: "Pages de documentation"
  - value: "CI"
    label: "Lint et tests à chaque push"
sections:
  - image:
      src: /projects/schulyf/section-1.avif
      width: 1600
      height: 1000
      alt: "Maquette illustrative : un reçu de paiement avec sa signature et son QR code, à côté de la page publique qui confirme que le reçu est valide."
    lead: "Reçu vérifiable."
    caption: "Un seul reçu signé, que chacun peut vérifier en ligne : fini les litiges sur un reçu perdu ou falsifié."
architecture:
  - label: "Interface"
    description: "Inertia + Vue 3, PrimeVue, Tailwind CSS v4"
  - label: "Back-end"
    description: "Laravel 13, authentification Fortify, routes typées (Wayfinder)"
  - label: "Reçus"
    description: "Reçu PDF unique signé HMAC + point de vérification public"
keyDecision: "Un reçu unique, signé par HMAC et vérifiable via un lien public : un reçu perdu ou falsifié n’est plus une source de litige."
links:
  - label: "github.com/kiri1101/student-management-system"
    url: "https://github.com/kiri1101/student-management-system"
---
## Le problème

Dans beaucoup d’universités, les admissions passent par des dossiers papier, les paiements par des reçus bancaires portés à la main et les annonces par le bouche-à-oreille. Un reçu perdu ou falsifié devient source de conflit.

## La solution

Conception et développement complets : modélisation, back-end, interface, tests et documentation.

Admissions en ligne triées par les agents de la scolarité ; l’admis devient étudiant.

Paiement par versements datés : situation financière calculée en temps réel, accès aux examens et reports gérés en conséquence.

## Le résultat

Code source public, documenté et testé, consultable sur GitHub.
