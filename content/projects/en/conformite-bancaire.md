---
slug: conformite-bancaire
title: "Banking compliance"
year: 2025
discipline: "Finance"
category: "Finance · Compliance"
summary: "Collecting, checking and tracking the client documentation banks must hold for international transfers."
role: "Lead developer"
timeline: "Dec 2025 — 2026"
team: "Banking sector, CEMAC zone · delivered at ADWA SARL"
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
  alt: "Illustrative mock-up: a client file being completed, with a form that flags an invalid registration number, a completeness gauge and a checklist of required documents."
stats:
  - value: "180+"
    label: "Vitest tests"
  - value: "0"
    label: "Type errors (nuxt typecheck)"
  - value: "BFF"
    label: "Secrets kept server-side"
sections:
  - image:
      src: /projects/conformite-bancaire/section-1.avif
      width: 1600
      height: 1000
      alt: "Illustrative mock-up: a dashboard of client files with their completeness, next document expiry and status."
    lead: "Audit readiness."
    caption: "Staff see at a glance which files are complete and which documents are expiring or missing."
architecture:
  - label: "Browser"
    description: "Nuxt 4 pages + PrimeVue, dynamic forms"
  - label: "BFF"
    description: "Nuxt (Nitro) server routes: session, API calls, error normalisation"
  - label: "Validation"
    description: "Zod schemas and validation utilities on the server"
  - label: "Logic"
    description: "Business decisions extracted into tested pure functions"
keyDecision: "Extract page decisions — which route to open, which display mode, which field to lock — into tested pure functions, so business logic is covered without a browser."
links: []
---
## The problem

In the CEMAC zone, every international transfer must be backed by complete, up-to-date client documentation. During audits, a bank that cannot produce it faces heavy penalties.

## The fix

Lead developer of the Nuxt 4 front end, built as a Backend-for-Frontend: Nuxt server routes talk to the API, so the browser never sees secrets.

Dynamic forms validated with Zod, document uploads, bilingual interface.

Real-time notifications in production: a Node.js / Express service, Socket.IO to clients and RabbitMQ event queues between servers.

Set up the Vitest suite and type checking as a gate on every change.

## The result

An application that guides bank staff in building and updating the files auditors require.
