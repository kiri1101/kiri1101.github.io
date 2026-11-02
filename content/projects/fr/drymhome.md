---
slug: drymhome
title: "DrymHome"
year: 2026
discipline: "Immobilier"
category: "Immobilier · Projet indépendant"
summary: "Plateforme de location pour locataires et agents : API, notifications temps réel et push, applications Nuxt."
role: "Conception & développement"
timeline: "avr. 2026 — aujourd’hui"
team: "Projet indépendant"
platforms: "Laravel 13, Sanctum, Reverb, Web Push, S3, Nuxt 4"
order: 8
featured: false
illustrative: true
accent:
  from: "#1a1410"
  to: "#3a2a1c"
cover:
  src: /projects/drymhome/cover.avif
  width: 1600
  height: 1200
  alt: "Maquette illustrative : la page des annonces des agents sur ordinateur et la page d’une annonce côté locataire sur téléphone, avec un bouton de demande de visite et une notification de confirmation."
stats:
  - value: "970+"
    label: "Tests Pest"
  - value: "CI"
    label: "Tests automatiques à chaque push"
  - value: "API"
    label: "Documentation générée depuis le code"
sections:
  - image:
      src: /projects/drymhome/section-1.avif
      width: 1600
      height: 1000
      alt: "Maquette illustrative : la page des demandes de visite des agents, mise à jour en direct, à côté d’un téléphone qui affiche une discussion et une notification push."
    lead: "Mises à jour en direct."
    caption: "Les demandes de visite et les messages arrivent en temps réel, avec des notifications push sur le téléphone."
architecture:
  - label: "Clients"
    description: "Deux applications Nuxt 4 : locataires et agents, back-office"
  - label: "API"
    description: "Laravel 13, Sanctum, Socialite, documentation Scramble"
  - label: "Temps réel"
    description: "Laravel Reverb (WebSockets) et Web Push"
  - label: "Médias"
    description: "Stockage S3, traitement d’images"
links: []
---
## Le problème

Trouver un logement passe souvent par des intermédiaires difficiles à joindre. DrymHome met en relation locataires et agents immobiliers, avec des annonces et des notifications en temps réel.

## La solution

Conception et développement de l’API Laravel 13 et des applications Nuxt 4 (locataires et agents, back-office).

Authentification par jeton et connexion sociale, notifications temps réel (Reverb) et push web, stockage des médias sur S3.

Documentation d’API générée automatiquement depuis le code (Scramble).

## Le résultat

En développement actif : une API largement testée et des applications Nuxt pour chaque profil d’utilisateur.
