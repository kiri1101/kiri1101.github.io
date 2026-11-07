---
slug: create-nuxt-primevue
title: "create-nuxt-primevue"
year: 2026
discipline: "Open source"
category: "Open source · CLI npm"
summary: "Une CLI npm qui lance des projets Nuxt 4 sur les dernières versions MIT de PrimeVue, et vérifie les projets existants avant qu’un changement de licence ne les surprenne."
role: "Conception & développement"
timeline: "nov. 2026"
team: "Projet open source personnel"
platforms: "Node.js, TypeScript, Nuxt 4, PrimeVue 4, Tailwind CSS 4, StrykerJS"
order: 10
featured: false
accent:
  from: "#06130e"
  to: "#0f4634"
cover:
  src: /projects/create-nuxt-primevue/cover.avif
  width: 1600
  height: 1200
  alt: "Un projet généré par create-nuxt-primevue : sa page de démonstration dans un navigateur, à côté de la sortie du terminal de la commande qui l’a créé."
stats:
  - value: "100 %"
    label: "Score de mutation sur les modules critiques"
  - value: "369"
    label: "Tests automatisés"
  - value: "4"
    label: "Gestionnaires de paquets testés en CI"
sections:
  - image:
      src: /projects/create-nuxt-primevue/section-1.avif
      width: 1600
      height: 1000
      alt: "Deux terminaux : doctor --check signale trois paquets Prime non MIT dans un projet en version 5, puis la même analyse réussit sur un projet généré."
    lead: "doctor, sur de vrais projets."
    caption: "Sur un projet en version 5, il liste chaque paquet qui n’est pas sous MIT. Sur un projet généré, la même analyse réussit."
architecture:
  - label: "CLI"
    description: "TypeScript ; quatre questions ou options, puis l’installation avec le gestionnaire de paquets du projet et un premier commit"
  - label: "Gabarit"
    description: "Nuxt 4, PrimeVue 4.5.5 et Tailwind 4 avec les couches CSS dans l’ordre, versions épinglées, polices auto-hébergées"
  - label: "Contrôle de licence"
    description: "Un script sans dépendance, dans le build : seule la licence exacte MIT passe, et il échoue par défaut"
  - label: "doctor"
    description: "Réutilise le contrôle pour analyser les projets existants, et ne change les versions qu’avec accord et un dépôt git propre"
keyDecision: "Lancer le contrôle de licence dans le script de build, et non dans un hook prebuild. Yarn 2 et les versions suivantes ignorent ces hooks, et un contrôle qui ne s’exécute jamais, sans le dire, est pire que pas de contrôle."
links:
  - label: "github.com/kiri1101/create-nuxt-primevue"
    url: "https://github.com/kiri1101/create-nuxt-primevue"
  - label: "npmjs.com/package/create-nuxt-primevue"
    url: "https://www.npmjs.com/package/create-nuxt-primevue"
---
## Le problème

`npm install primevue` installe désormais la version 5, qui n’est plus sous licence MIT. Sans clé de licence, un badge rouge s’affiche sur chaque page, et rien n’échoue : l’installation fonctionne et le build passe. `primeicons` et `@primeuix/themes` ont suivi, avec d’autres numéros de version : corriger un seul paquet ne suffit donc pas.

Mettre en place cette pile me coûtait déjà du temps sur chaque projet client : les bonnes versions, les couches CSS de Tailwind face aux styles de PrimeVue, le thème, les polices.

## La solution

Deux commandes. `npm create nuxt-primevue@latest` crée un projet Nuxt 4 sur les dernières versions MIT, avec votre thème, votre couleur principale et votre police, et toute la pile déjà en place. `npx create-nuxt-primevue doctor` analyse un projet existant, montre les changements exacts et ne les applique qu’avec votre accord et un dépôt git propre.

Les projets générés exécutent aussi un contrôle de licence pendant le build. Seule la licence exacte MIT passe, et le contrôle échoue par défaut : si un paquet déclaré n’est pas installé, le build s’arrête.

## Le résultat

La version 1.0.0 est publiée sur npm. Les tests couvrent uniquement les comportements critiques et sont validés par des tests de mutation, avec un plancher de 100 % sur les modules critiques. La CI construit de vrais projets avec npm, pnpm, Yarn et bun sous Linux, et npm sous Windows. Un contrôle dans le navigateur doit aussi trouver le badge de licence sur une installation volontaire de la version 5, pour qu’un test réussi ait un sens. Un guide public couvre le changement de licence et treize problèmes de cette pile.
