---
slug: ministere-fonction-publique
title: "Ministry of Public Service"
year: 2025
discipline: "Public sector"
category: "Public sector · Procedures"
summary: "Reference platform for administrative procedures: steps, required documents and contacts for every public service."
role: "Lead developer"
timeline: "2025 — 2026"
team: "Ministry of Public Service and Administrative Reform · delivered at ADWA SARL"
platforms: "Laravel 12, Sanctum, Pest, React, TypeScript"
order: 3
featured: false
illustrative: true
accent:
  from: "#1a0f1c"
  to: "#34203a"
cover:
  src: /projects/ministere-fonction-publique/cover.avif
  width: 1600
  height: 1200
  alt: "Illustrative mock-up: a public procedure page showing the steps to follow, the required documents and the contact point for an identity-card renewal, with the four access levels below."
stats:
  - value: "280+"
    label: "Pest tests"
  - value: "ADR"
    label: "Documented architecture decisions"
  - value: "12"
    label: "Laravel version after upgrade"
sections:
  - image:
      src: /projects/ministere-fonction-publique/section-1.avif
      width: 1600
      height: 1000
      alt: "Illustrative mock-up: the administration’s back office, with a table of procedures and their status and the four access levels (public, citizen, admin, super-admin)."
    lead: "Back office."
    caption: "The administration keeps each procedure up to date; four access levels decide who can read or edit."
architecture:
  - label: "Client"
    description: "React 18 + TypeScript application"
  - label: "API"
    description: "Laravel 12, Sanctum authentication, one Form Request per route"
  - label: "Access"
    description: "Four levels: public, citizen, admin, super-admin"
  - label: "Contract"
    description: "Route reference generated from the code (php artisan docs:routes)"
keyDecision: "Generate the route reference from the code and fail the test suite when it is stale: the client and the API can no longer drift apart silently."
links:
  - label: "servicepublic.gov.cm"
    url: "https://servicepublic.gov.cm"
---
## The problem

For every public service, citizens need to know which steps to follow, which documents to provide and whom to contact. The platform centralises this information and lets the administration keep it up to date.

## The fix

Lead developer of the Laravel API and the React / TypeScript interface.

Four-level access control (public, citizen, admin, super-admin), systematic Form Request validation, rate limiting and HTTP caching (ETag) on exposed routes.

Upgrade to Laravel 12, code reviews, audits and a documented remediation log.

## The result

A documented, role-secured API covered by more than 280 tests, with a contract the client can rely on.
