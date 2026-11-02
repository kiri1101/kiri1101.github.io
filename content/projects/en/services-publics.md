---
slug: services-publics
title: "SERVICES PUBLICS"
year: 2023
discipline: "Public sector"
category: "Public sector · E-government"
summary: "The national portal for administrative procedures and non-tax revenue collection: user accounts with OTP, declarations with supporting documents, online payments."
role: "Lead developer"
timeline: "2023 — present"
team: "Ministry of Finance — Directorate General of Budget · delivered at ADWA SARL"
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
  alt: "Home page of the SERVICES PUBLICS portal in a browser window: a welcome message for the non-tax revenue platform, with the buttons for the user area and the administration area."
stats:
  - value: "≈ 900"
    label: "Commits since 2023"
  - value: "3"
    label: "Environments: test, pre-production, production"
  - value: "Docker"
    label: "Containerised environments"
sections:
  - image:
      src: /projects/services-publics/section-1.avif
      width: 1600
      height: 1000
      alt: "Close-up of the portal’s welcome area and its two entry points, the user area and the administration area."
    lead: "Two entry points."
    caption: "From the home page, users and the administration each choose their own workspace."
architecture:
  - label: "Browser"
    description: "Vue 3 + Inertia, server-side rendered"
  - label: "Routes"
    description: "Separate areas: public, signed-in user, authentication, payments"
  - label: "Business logic"
    description: "Single-responsibility Action classes · middleware for authentication, logging and upload checks"
  - label: "Services"
    description: "Online and bank payment · document storage · real-time notifications"
keyDecision: "Keep business logic in Action classes rather than controllers, so it can be tested and reused across user journeys."
links:
  - label: "services-publics.cm"
    url: "https://services-publics.cm/services/publics"
---
## The problem

Administrative procedures and non-tax revenue collection span many ministries. SERVICES PUBLICS, a Ministry of Finance platform, brings them into a single portal where users create an account, build their file and pay their fees online.

## The fix

Lead developer of the front office and back office — main contributor, with about 90% of the roughly 900 commits since 2023.

End-to-end user journey: sign-up, OTP authentication, service catalogue, declarations with supporting documents, online or bank payment.

Server-side rendering (SSR) for a fast first paint and good search visibility.

## The result

In production at services-publics.cm.
