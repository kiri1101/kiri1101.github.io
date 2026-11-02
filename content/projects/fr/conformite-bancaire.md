---
slug: conformite-bancaire
title: "Conformité bancaire"
year: 2025
discipline: "Finance"
category: "Finance · Conformité"
summary: "Collecte, contrôle et suivi de la documentation clients exigée des banques pour les transferts internationaux."
role: "Lead développeur"
timeline: "déc. 2025 — 2026"
team: "Secteur bancaire de la zone CEMAC · réalisé chez ADWA SARL"
platforms: "Nuxt 4, TypeScript, Zod, PrimeVue, Vitest"
order: 4
featured: false
illustrative: true
accent:
  from: "#1c1509"
  to: "#3a2c12"
cover:
  src: /projects/conformite-bancaire/cover.avif
  width: 1600
  height: 1200
  alt: "Maquette illustrative : un dossier client en cours de constitution, avec un formulaire qui signale un numéro d’immatriculation invalide, une jauge de complétude et la liste des pièces requises."
stats:
  - value: "180+"
    label: "Tests Vitest"
  - value: "0"
    label: "Erreur de typage (nuxt typecheck)"
  - value: "BFF"
    label: "Secrets gardés côté serveur"
sections:
  - image:
      src: /projects/conformite-bancaire/section-1.avif
      width: 1600
      height: 1000
      alt: "Maquette illustrative : un tableau de bord des dossiers clients, avec leur complétude, la prochaine échéance de pièce et leur statut."
    lead: "Prêt pour l’audit."
    caption: "Le personnel voit d’un coup d’œil quels dossiers sont complets et quelles pièces expirent ou manquent."
architecture:
  - label: "Navigateur"
    description: "Pages Nuxt 4 + PrimeVue, formulaires dynamiques"
  - label: "BFF"
    description: "Routes serveur Nuxt (Nitro) : session, appels API, normalisation des erreurs"
  - label: "Validation"
    description: "Schémas Zod et utilitaires de validation côté serveur"
  - label: "Logique"
    description: "Décisions métier extraites en fonctions pures testées"
keyDecision: "Extraire les décisions des pages — quelle route ouvrir, quel mode d’affichage, quel champ verrouiller — dans des fonctions pures testées : la logique métier est couverte sans navigateur."
links: []
---
## Le problème

Dans la zone CEMAC, chaque transfert international doit être justifié par une documentation client complète et à jour. Lors des audits, une banque incapable de la produire s’expose à de lourdes sanctions.

## La solution

Lead développeur du front-end Nuxt 4, organisé en Backend-for-Frontend : les routes serveur Nuxt dialoguent avec l’API et le navigateur ne voit jamais les secrets.

Formulaires dynamiques validés par Zod, téléversement des pièces, interface bilingue.

Mise en place de la suite de tests Vitest et de la vérification de types comme garde-fou à chaque changement.

## Le résultat

Une application qui guide les équipes bancaires dans la constitution et la mise à jour des dossiers exigés lors des audits.
