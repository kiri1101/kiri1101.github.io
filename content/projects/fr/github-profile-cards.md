---
slug: github-profile-cards
title: "github-profile-cards"
year: 2026
discipline: "Open source"
category: "Open source · Cloudflare Workers"
summary: "Des cartes GitHub de statistiques et de langages, auto-hébergées sur Cloudflare Workers : le travail privé compte en totaux, et aucun nom de dépôt n’apparaît jamais."
role: "Conception & développement"
timeline: "oct. — nov. 2026"
team: "Projet open source personnel"
platforms: "Cloudflare Workers, Workers KV, TypeScript, API GraphQL de GitHub, StrykerJS"
order: 11
featured: false
accent:
  from: "#0a1220"
  to: "#16386b"
cover:
  src: /projects/github-profile-cards/cover.avif
  width: 1600
  height: 1200
  alt: "Les cartes de statistiques et de langages de github-profile-cards, en service, dans une fenêtre de navigateur sombre."
stats:
  - value: "B- → B+"
    label: "Note GitHub une fois le travail privé compté"
  - value: "100 %"
    label: "Score de mutation sur 15 modules critiques"
  - value: "313"
    label: "Tests automatisés"
sections:
  - image:
      src: /projects/github-profile-cards/section-1.avif
      width: 1600
      height: 1000
      alt: "La même carte de statistiques dans deux fenêtres de navigateur, l’une en thème clair et l’autre en thème sombre."
    lead: "Clair et sombre."
    caption: "Chaque carte est générée à l’avance dans les deux thèmes : elle suit le thème de GitHub sans aucun travail à la requête."
architecture:
  - label: "Actualisation"
    description: "Une tâche cron toutes les 6 heures récupère les chiffres avec deux jetons GitHub en lecture seule"
  - label: "Validation"
    description: "Les nouvelles données ne remplacent les anciennes que si elles sont valides ; une chute soudaine est retenue tant qu’elle ne se répète pas"
  - label: "Stockage"
    description: "SVG clairs et sombres, générés à l’avance et conservés dans Workers KV"
  - label: "Diffusion"
    description: "Les requêtes lisent uniquement KV, avec une carte de remplacement s’il est vide, jamais une image cassée"
keyDecision: "Générer les cartes à l’avance et ne stocker que des totaux. Les requêtes n’atteignent jamais GitHub : les cartes ne peuvent pas heurter une limite de débit, et aucun nom de dépôt n’entre dans les données stockées."
links:
  - label: "github.com/kiri1101/github-profile-cards"
    url: "https://github.com/kiri1101/github-profile-cards"
---
## Le problème

L’essentiel de mon travail se trouve dans des dépôts clients privés : les cartes de statistiques publiques n’en comptaient qu’environ un cinquième. Puis l’instance publique de github-readme-stats est tombée, et mes cartes sont devenues des images cassées. Je voulais un profil qui montre ce que je livre vraiment, sans révéler le nom d’un client ou d’un dépôt.

## La solution

Un petit Worker Cloudflare qui tourne sur l’offre gratuite. Une tâche cron récupère les chiffres toutes les 6 heures avec deux jetons en lecture seule, les valide, génère des cartes claires et sombres et les stocke dans KV. Les requêtes lisent uniquement ce qui est stocké : il n’y a donc rien à limiter. Les cartes affichent des totaux publics, privés et globaux, jamais de noms.

Chacun peut déployer sa propre copie avec un bouton Deploy to Cloudflare et deux jetons.

## Le résultat

Les cartes sont en ligne sur mon profil GitHub, et ma note est passée de B- à B+ une fois le travail privé compté. La version 1.0.0 est publique, et le bouton de déploiement a été testé de bout en bout sur un compte Cloudflare distinct. Les tests couvrent les comportements critiques, avec un score de mutation de 100 % sur 15 modules critiques.
