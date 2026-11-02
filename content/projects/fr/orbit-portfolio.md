---
slug: orbit-portfolio
title: "Orbit"
year: 2026
discipline: "Web"
category: "Web · Gabarit de portfolio"
summary: "Un gabarit de portfolio en React, conçu pour répondre à l’offre d’un client : une orbe 3D, une galerie en spirale et des pages de projet, qui restent rapides sur un mobile."
role: "Conception & développement"
timeline: "2026"
team: "Projet personnel"
platforms: "React 19, React Router, three.js, Cloudflare"
order: 9
featured: false
accent:
  from: "#14101c"
  to: "#2b1f45"
cover:
  src: /projects/orbit-portfolio/cover.avif
  width: 1600
  height: 1200
  alt: "La démo Orbit : la galerie de projets en suspension dans un espace 3D sur un navigateur de bureau, et la même vue sur téléphone."
stats:
  - value: "98–100"
    label: "Score Lighthouse mobile"
  - value: "≈ 50 fps"
    label: "Scène 3D en worker sur un Intel HD 4600"
  - value: "0"
    label: "Décalage de mise en page (CLS)"
sections:
  - image:
      src: /projects/orbit-portfolio/section-1.avif
      width: 1600
      height: 1000
      alt: "La démo Orbit : une page d’étude de cas, à côté du moment où l’orbe lumineux s’ouvre sur le fond étoilé."
    lead: "Étude de cas et transition."
    caption: "Chaque projet s’ouvre en une page d’étude de cas rapide ; entre l’accueil et la galerie, l’orbe s’ouvre sur la galaxie."
architecture:
  - label: "Navigateur"
    description: "HTML prérendu pour chaque route ; le contenu est du vrai HTML, même sans WebGL"
  - label: "Scène 3D"
    description: "three.js chargé après l’interactivité, rendu dans un Web Worker (OffscreenCanvas), repli sur le thread principal"
  - label: "Contenu"
    description: "Un fichier Markdown par projet ; ordre, comptes et plages d’années calculés"
  - label: "Hébergement"
    description: "Statique sur Cloudflare, plus une petite fonction pour le formulaire de contact protégé par Turnstile"
keyDecision: "Prérendre toutes les routes en HTML statique et ne charger la 3D qu’après l’interactivité : le premier affichage reste du HTML simple, ce qui maintient le score Lighthouse mobile au-dessus de 90."
links: []
---
## Le problème

Un client demandait, pour une offre, un exemple en ligne d’un portfolio React soigné. Les portfolios haut de gamme que j’ai étudiés sont spectaculaires mais lents sur mobile, avec des scores Lighthouse mobile de 29 à 57. Je voulais le même effet, avec un chargement instantané.

## La solution

Conception et développement complets : une orbe qui devient un monogramme puis un anneau au défilement, une bascule en trou noir, puis une galerie de projets en spirale sur une photographie du ciel profond, avec une vue en liste.

React 19 avec React Router en mode framework, chaque route prérendue en HTML statique. La scène three.js se charge après l’interactivité et s’affiche depuis un Web Worker via OffscreenCanvas, avec un repli sur le thread principal et une qualité adaptative.

Un fichier Markdown par projet : ajouter, modifier ou retirer un projet ne demande aucun changement de code, et les comptes et plages d’années sont calculés.

## Le résultat

Un portfolio qui obtient 98 à 100 en performance Lighthouse mobile, avec un blocage total (TBT) sous 150 ms et un CLS de 0, et dont la scène 3D tient environ 50 images par seconde sur un Intel HD 4600 de 2013. Mes propres pages sont construites sur ce gabarit.
