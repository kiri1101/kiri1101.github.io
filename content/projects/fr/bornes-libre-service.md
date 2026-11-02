---
slug: bornes-libre-service
title: "Bornes en libre-service"
year: 2023
discipline: "Transport"
category: "Transport · Bornes interactives"
summary: "La billetterie CAMRAIL sur bornes interactives en gares de Douala et Yaoundé, puis une borne multiservices pour un transporteur interurbain : imprimante thermique, lecteur QR et scanner de pièces d’identité."
role: "Lead développeur"
timeline: "2023 — aujourd’hui"
team: "CAMRAIL et un transporteur interurbain · réalisé chez ADWA SARL"
platforms: "Tauri 2, Nuxt 4, Nitro, Laravel, Inertia"
order: 2
featured: true
accent:
  from: "#0d1420"
  to: "#1b2c4a"
cover:
  src: /projects/bornes-libre-service/cover.avif
  width: 1600
  height: 1200
  alt: "Écrans de la borne libre-service : la page d’accueil avec le bouton Acheter un billet et trois autres choix, devant la liste des départs avec horaires, prix et places restantes."
stats:
  - value: "150+"
    label: "Commits sur le client borne"
  - value: "OpenSpec"
    label: "Spécification exécutable et journal des décisions"
  - value: "0"
    label: "Donnée stockée sur la borne"
sections:
  - image:
      src: /projects/bornes-libre-service/section-1.avif
      width: 1600
      height: 1000
      alt: "Deux écrans de la borne : le formulaire du passager avec son clavier à l’écran, et la confirmation du paiement par mobile money avec un compte à rebours."
    lead: "Des informations au paiement."
    caption: "Un clavier à l’écran pour la saisie, puis un paiement confirmé sur le téléphone du voyageur, avec un compte à rebours."
architecture:
  - label: "Borne"
    description: "Application Windows verrouillée : Tauri 2 + Nuxt 4, écran 1280 × 1024"
  - label: "Périphériques"
    description: "Imprimante thermique, lecteur QR, scanner d’identité via un module natif Tauri"
  - label: "Façade"
    description: "Service hébergé Nuxt / Nitro qui détient les identifiants et adapte les réponses de l’ERP"
  - label: "ERP"
    description: "Tarifs, places disponibles et émission des billets côté transporteur"
keyDecision: "Faire de la borne un client léger : aucun identifiant, aucun tarif et aucune donnée persistée sur la machine. Tout passe par la façade hébergée, ce qui limite l’impact d’une borne compromise."
links: []
---
## Le problème

Acheter un billet de train ou de bus suppose souvent de faire la queue au guichet. Les bornes en libre-service permettent de rechercher un trajet, de payer et d’imprimer son billet sans agent.

## La solution

Billetterie CAMRAIL : application web de vente de billets déployée sur des bornes interactives dans les gares de Douala et Yaoundé.

Borne multiservices : seul développeur du client borne (Tauri 2 + Nuxt 4) et de l’API façade (Nuxt / Nitro) qui le relie à l’ERP du transporteur.

Pilotage des périphériques : imprimante thermique, lecteur de QR codes, scanner de passeports et de pièces d’identité.

## Le résultat

Billetterie CAMRAIL en service sur bornes en gares de Douala et Yaoundé ; borne multiservices en préparation pour un pilote de deux bornes sur l’axe Douala–Yaoundé.
