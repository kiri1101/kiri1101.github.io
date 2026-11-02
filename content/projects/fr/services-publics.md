---
slug: services-publics
title: "SERVICES PUBLICS"
year: 2023
discipline: "Secteur public"
category: "Secteur public · E-gouvernement"
summary: "Le portail national qui centralise les démarches administratives et la collecte des recettes non fiscales : comptes usagers avec OTP, déclarations et pièces justificatives, paiements en ligne."
role: "Lead développeur"
timeline: "2023 — aujourd’hui"
team: "Ministère des Finances — Direction Générale du Budget · réalisé chez ADWA SARL"
platforms: "Laravel, Vue 3, Inertia (SSR), Laravel Echo, Docker"
order: 1
featured: true
accent:
  from: "#0b1a14"
  to: "#14352a"
cover:
  src: /projects/services-publics/cover.avif
  width: 1600
  height: 1200
  alt: "Page d’accueil du portail SERVICES PUBLICS dans une fenêtre de navigateur : message de bienvenue de la plateforme des recettes non fiscales, avec les boutons Espace Usager et Espace Administration."
stats:
  - value: "≈ 900"
    label: "Commits depuis 2023"
  - value: "3"
    label: "Environnements : test, pré-production, production"
  - value: "Docker"
    label: "Environnements conteneurisés"
sections:
  - image:
      src: /projects/services-publics/section-1.avif
      width: 1600
      height: 1000
      alt: "Gros plan sur la zone d’accueil du portail et ses deux points d’entrée, l’espace usager et l’espace administration."
    lead: "Deux espaces."
    caption: "Dès l’accueil, l’usager et l’administration choisissent chacun leur espace de travail."
architecture:
  - label: "Navigateur"
    description: "Vue 3 + Inertia, rendu serveur (SSR)"
  - label: "Routes"
    description: "Espaces séparés : public, usager authentifié, authentification, paiements"
  - label: "Métier"
    description: "Classes Action à responsabilité unique · middlewares d’authentification, de journalisation et de contrôle des téléversements"
  - label: "Services"
    description: "Paiement en ligne et bancaire · stockage des pièces · notifications temps réel"
keyDecision: "Isoler la logique métier dans des classes Action plutôt que dans les contrôleurs, pour la tester et la réutiliser entre les parcours."
links:
  - label: "services-publics.cm"
    url: "https://services-publics.cm/services/publics"
---
## Le problème

Les démarches administratives et la collecte des recettes non fiscales relèvent de nombreux ministères. SERVICES PUBLICS, plateforme du Ministère des Finances, les rassemble dans un portail unique où l’usager crée son compte, constitue son dossier et règle ses frais en ligne.

## La solution

Lead développeur du front-office et du back-office — principal contributeur, avec environ 90 % des quelque 900 commits depuis 2023.

Parcours usager complet : inscription, authentification par OTP, consultation des services, déclarations avec pièces justificatives, paiement en ligne ou bancaire.

Rendu côté serveur (SSR) pour un premier affichage rapide et un bon référencement.

## Le résultat

En production sur services-publics.cm.
