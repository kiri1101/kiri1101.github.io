---
slug: github-profile-cards
title: "github-profile-cards"
year: 2026
discipline: "Open source"
category: "Open source · Cloudflare Workers"
summary: "Self-hosted GitHub stats and languages cards on Cloudflare Workers: private work counts as totals, and no repository name ever appears."
role: "Design & development"
timeline: "Oct — Nov 2026"
team: "Personal open-source project"
platforms: "Cloudflare Workers, Workers KV, TypeScript, GitHub GraphQL API, StrykerJS"
order: 11
featured: false
accent:
  from: "#0a1220"
  to: "#16386b"
cover:
  src: /projects/github-profile-cards/cover.avif
  width: 1600
  height: 1200
  alt: "The live stats and languages cards from github-profile-cards, in a dark browser window."
stats:
  - value: "B- → B+"
    label: "GitHub grade once private work counted"
  - value: "100%"
    label: "Mutation score on 15 critical modules"
  - value: "313"
    label: "Automated tests"
sections:
  - image:
      src: /projects/github-profile-cards/section-1.avif
      width: 1600
      height: 1000
      alt: "The same stats card in two browser windows, one with the light theme and one with the dark theme."
    lead: "Light and dark."
    caption: "Each card is rendered in both themes ahead of time, so it follows GitHub’s theme without any work at request time."
architecture:
  - label: "Refresh"
    description: "A cron trigger every 6 hours fetches the numbers with two read-only GitHub tokens"
  - label: "Validation"
    description: "New data replaces the old only if it passes; a sudden drop is held back until it repeats"
  - label: "Storage"
    description: "Light and dark SVGs, rendered ahead of time and kept in Workers KV"
  - label: "Delivery"
    description: "Requests only read KV, with a placeholder card if it’s ever empty, never a broken image"
keyDecision: "Render the cards ahead of time and store totals only. Requests never reach GitHub, so the cards can’t hit a rate limit, and no repository name ever enters the stored data."
links:
  - label: "github.com/kiri1101/github-profile-cards"
    url: "https://github.com/kiri1101/github-profile-cards"
---
## The problem

Most of my work lives in private client repositories, so public stats cards counted about a fifth of it. Then the public github-readme-stats instance went down, and my cards turned into broken images. I wanted a profile that shows how much I really ship, without revealing a client or repository name.

## The fix

A small Cloudflare Worker that runs on the free plan. A cron job fetches the numbers every 6 hours with two read-only tokens, validates them, renders light and dark cards, and stores them in KV. Requests only read what’s stored, so there’s nothing to rate-limit. The cards show public, private and total counts, never names.

Anyone can deploy their own copy with a Deploy to Cloudflare button and two tokens.

## The result

The cards are live on my GitHub profile, and my grade went from B- to B+ once private work counted. Version 1.0.0 is public, and the Deploy button was tested end to end on a separate Cloudflare account. The tests cover critical behaviour, with a mutation score of 100% on 15 critical modules.
