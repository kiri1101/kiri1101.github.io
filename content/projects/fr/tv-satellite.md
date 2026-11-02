---
slug: tv-satellite
title: "Abonnements TV par satellite"
year: 2024
discipline: "Médias"
category: "Médias · Application mobile"
summary: "Application Android, API mobile et back-office : abonnements, renouvellements, paiement Mobile Money et OTP par SMS."
role: "Développeur principal"
timeline: "2024 — 2026"
team: "Un opérateur de télévision par satellite · réalisé chez ADWA SARL"
platforms: "Laravel 10, Inertia (SSR), Vue 3, Quasar, MeSomb, Vonage"
order: 6
featured: false
illustrative: true
accent:
  from: "#0a1a1d"
  to: "#12363d"
cover:
  src: /projects/tv-satellite/cover.avif
  width: 1600
  height: 1200
  alt: "Maquette illustrative : deux écrans de l’application Android : un abonnement avec un bouton de renouvellement, et un paiement Mobile Money confirmé par un code SMS à usage unique."
stats:
  - value: "Android"
    label: "Application packagée avec Quasar"
  - value: "XAF"
    label: "Paiements Mobile Money"
  - value: "SSR"
    label: "Back-office rendu côté serveur"
sections:
  - image:
      src: /projects/tv-satellite/section-1.avif
      width: 1600
      height: 1000
      alt: "Maquette illustrative : le back-office, avec les commandes d’abonnement et leur statut de paiement à côté des tickets de support."
    lead: "Back-office."
    caption: "Commandes, renouvellements et tickets de support sur un seul écran, servis par le même code Laravel que l’application."
architecture:
  - label: "Mobile"
    description: "Application Android (Quasar) consommant l’API JSON"
  - label: "Back-office"
    description: "Laravel + Inertia / Vue 3 avec rendu serveur"
  - label: "API"
    description: "Enveloppe JSON commune pour toutes les réponses"
  - label: "Services"
    description: "MeSomb (Mobile Money) · Vonage (SMS / OTP)"
keyDecision: "Une seule base Laravel pour deux surfaces — back-office web et API mobile — avec un format de réponse unique, pour ne maintenir qu’un seul modèle métier."
links: []
---
## Le problème

Les abonnés d’un opérateur de télévision par satellite doivent pouvoir souscrire, renouveler et payer depuis leur téléphone, tandis que l’équipe gère abonnements, commandes et support depuis un back-office.

## La solution

Développeur principal du back-end Laravel, qui sert à la fois le back-office web et l’API mobile.

Application Android packagée avec Quasar.

Paiement Mobile Money via MeSomb, vérification par OTP envoyé par SMS, porte-monnaie et tickets de support.

## Le résultat

Abonnements, renouvellements et paiements gérés de bout en bout, du téléphone de l’abonné au back-office.
