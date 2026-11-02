---
slug: drymhome
title: "DrymHome"
year: 2026
discipline: "Real estate"
category: "Real estate · Independent project"
summary: "Rental platform for tenants and agents: API, real-time and push notifications, Nuxt apps."
role: "Design & development"
timeline: "Apr 2026 — present"
team: "Independent project"
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
  alt: "Illustrative mock-up: the agents’ listings page on a desktop and the tenant’s listing page on a phone, with a viewing request button and a confirmation notification."
stats:
  - value: "970+"
    label: "Pest tests"
  - value: "CI"
    label: "Automated tests on every push"
  - value: "API"
    label: "Documentation generated from code"
sections:
  - image:
      src: /projects/drymhome/section-1.avif
      width: 1600
      height: 1000
      alt: "Illustrative mock-up: the agents’ viewing requests page, updated live, next to a phone showing a chat and a push notification."
    lead: "Live updates."
    caption: "Viewing requests and messages arrive in real time, with push notifications on the phone."
architecture:
  - label: "Clients"
    description: "Two Nuxt 4 apps: tenants and agents, back office"
  - label: "API"
    description: "Laravel 13, Sanctum, Socialite, Scramble docs"
  - label: "Real-time"
    description: "Laravel Reverb (WebSockets) and Web Push"
  - label: "Media"
    description: "S3 storage, image processing"
links: []
---
## The problem

Finding a home often depends on hard-to-reach intermediaries. DrymHome connects tenants and estate agents with listings and real-time notifications.

## The fix

Designed and built the Laravel 13 API and the Nuxt 4 apps (tenants and agents, back office).

Token and social sign-in, real-time (Reverb) and web-push notifications, media storage on S3.

API documentation generated automatically from the code (Scramble).

## The result

In active development: a thoroughly tested API and Nuxt apps for each type of user.
