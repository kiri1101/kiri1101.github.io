---
slug: ministere-fonction-publique
title: "Ministère de la Fonction Publique"
year: 2025
discipline: "Secteur public"
category: "Secteur public · Procédures"
summary: "Plateforme de référence des procédures administratives : étapes, pièces requises et contacts de chaque service public."
role: "Lead développeur"
timeline: "2025 — 2026"
team: "Ministère de la Fonction Publique et de la Réforme Administrative · réalisé chez ADWA SARL"
platforms: "Laravel 12, Sanctum, Pest, React, TypeScript"
order: 3
featured: false
illustrative: true
accent:
  from: "#1a0f1c"
  to: "#34203a"
cover:
  src: /projects/ministere-fonction-publique/cover.avif
  width: 1600
  height: 1200
  alt: "Maquette illustrative : une page de procédure publique avec les étapes à suivre, les pièces à fournir et le point de contact pour le renouvellement d’une carte d’identité, et les quatre niveaux d’accès en dessous."
stats:
  - value: "280+"
    label: "Tests Pest"
  - value: "ADR"
    label: "Décisions d’architecture documentées"
  - value: "12"
    label: "Version de Laravel après migration"
sections:
  - image:
      src: /projects/ministere-fonction-publique/section-1.avif
      width: 1600
      height: 1000
      alt: "Maquette illustrative : le back-office de l’administration, avec un tableau des procédures et de leur statut, et les quatre niveaux d’accès (public, citoyen, admin, super-admin)."
    lead: "Back-office."
    caption: "L’administration tient chaque procédure à jour ; quatre niveaux d’accès décident qui peut lire ou modifier."
architecture:
  - label: "Client"
    description: "Application React 18 + TypeScript"
  - label: "API"
    description: "Laravel 12, authentification Sanctum, une Form Request par route"
  - label: "Accès"
    description: "Quatre niveaux : public, usager, administrateur, super-administrateur"
  - label: "Contrat"
    description: "Référence des routes générée depuis le code (php artisan docs:routes)"
keyDecision: "Générer la référence des routes depuis le code et faire échouer la suite de tests si elle n’est plus à jour : le client et l’API ne peuvent plus diverger en silence."
links:
  - label: "servicepublic.gov.cm"
    url: "https://servicepublic.gov.cm"
---
## Le problème

Pour chaque service public, l’usager doit savoir quelles étapes suivre, quelles pièces fournir et qui contacter. La plateforme centralise ces informations et permet à l’administration de les tenir à jour.

## La solution

Lead développeur de l’API Laravel et de l’interface React / TypeScript.

Contrôle d’accès en quatre niveaux (public, usager, administrateur, super-administrateur), validation systématique par Form Requests, limitation de débit et cache HTTP (ETag) sur les routes exposées.

Migration vers Laravel 12, revues de code, audits et registre de remédiation documentés.

## Le résultat

Une API documentée, sécurisée par rôles et couverte par plus de 280 tests, avec un contrat que le client peut suivre sans surprise.
