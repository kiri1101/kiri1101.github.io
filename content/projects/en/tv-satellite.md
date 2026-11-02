---
slug: tv-satellite
title: "Satellite TV subscriptions"
year: 2024
discipline: "Media"
category: "Media · Mobile app"
summary: "Android app, mobile API and back office: subscriptions, renewals, Mobile Money payments and SMS OTP."
role: "Main developer"
timeline: "2024 — 2026"
team: "A satellite TV operator · delivered at ADWA SARL"
platforms: "Laravel 10, Inertia (SSR), Vue 3, Quasar, MeSomb, Vonage"
order: 6
featured: false
illustrative: true
accent:
  from: "#0a1a1d"
  to: "#12363d"
cover:
  src: /projects/tv-satellite/cover.avif
  width: 1600
  height: 1200
  alt: "Illustrative mock-up: two Android app screens: a subscription with a renew button, and a Mobile Money payment confirmed with an SMS one-time code."
stats:
  - value: "Android"
    label: "App packaged with Quasar"
  - value: "XAF"
    label: "Mobile Money payments"
  - value: "SSR"
    label: "Server-rendered back office"
sections:
  - image:
      src: /projects/tv-satellite/section-1.avif
      width: 1600
      height: 1000
      alt: "Illustrative mock-up: the back office, with subscription orders and their payment status next to support tickets."
    lead: "Back office."
    caption: "Orders, renewals and support tickets on one screen, served by the same Laravel code as the app."
architecture:
  - label: "Mobile"
    description: "Android app (Quasar) consuming the JSON API"
  - label: "Back office"
    description: "Laravel + Inertia / Vue 3, server-side rendered"
  - label: "API"
    description: "One shared JSON envelope for every response"
  - label: "Services"
    description: "MeSomb (Mobile Money) · Vonage (SMS / OTP)"
keyDecision: "One Laravel codebase for two surfaces — web back office and mobile API — with a single response format, so there is only one business model to maintain."
links: []
---
## The problem

Subscribers of a satellite TV operator need to subscribe, renew and pay from their phone, while staff manage subscriptions, orders and support from a back office.

## The fix

Main developer of the Laravel back end, which serves both the web back office and the mobile API.

Android app packaged with Quasar.

Mobile Money payments through MeSomb, SMS OTP verification, wallet and support tickets.

## The result

Subscriptions, renewals and payments handled end to end, from the subscriber’s phone to the back office.
