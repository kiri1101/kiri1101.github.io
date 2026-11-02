---
slug: bornes-libre-service
title: "Self-service kiosks"
year: 2023
discipline: "Transport"
category: "Transport · Self-service kiosks"
summary: "CAMRAIL ticketing on interactive kiosks in Douala and Yaoundé stations, then a multi-service kiosk for an intercity bus operator: thermal printer, QR reader and ID-document scanner."
role: "Lead developer"
timeline: "2023 — present"
team: "CAMRAIL and an intercity bus operator · delivered at ADWA SARL"
platforms: "Tauri 2, Nuxt 4, Nitro, Laravel, Inertia"
order: 2
featured: true
accent:
  from: "#0d1420"
  to: "#1b2c4a"
cover:
  src: /projects/bornes-libre-service/cover.avif
  width: 1600
  height: 1200
  alt: "Self-service kiosk screens: the welcome page with a Buy a ticket button and three more options, in front of the list of departures with their times, prices and seats left."
stats:
  - value: "150+"
    label: "Commits on the kiosk client"
  - value: "OpenSpec"
    label: "Executable specification and decision log"
  - value: "0"
    label: "Data stored on the kiosk"
sections:
  - image:
      src: /projects/bornes-libre-service/section-1.avif
      width: 1600
      height: 1000
      alt: "Two kiosk screens: the passenger form with an on-screen keyboard, and the mobile-money payment confirmation with a countdown."
    lead: "From passenger details to payment."
    caption: "An on-screen keyboard for the details, then a payment confirmed on the traveller’s phone, with a countdown."
architecture:
  - label: "Kiosk"
    description: "Locked-down Windows app: Tauri 2 + Nuxt 4, 1280 × 1024 screen"
  - label: "Peripherals"
    description: "Thermal printer, QR reader, ID scanner through a native Tauri sidecar"
  - label: "Façade"
    description: "Hosted Nuxt / Nitro service that holds the credentials and reshapes ERP responses"
  - label: "ERP"
    description: "Fares, seat availability and ticket issuance on the operator side"
keyDecision: "Make the kiosk a thin client: no credentials, no fares and no persisted data on the machine. Everything goes through the hosted façade, which limits the damage a compromised kiosk could do."
links: []
---
## The problem

Buying a train or bus ticket usually means queuing at a counter. Self-service kiosks let travellers search a trip, pay and print their ticket without an agent.

## The fix

CAMRAIL ticketing: a web ticket-sales application deployed on interactive kiosks in Douala and Yaoundé stations.

Multi-service kiosk: sole developer of the kiosk client (Tauri 2 + Nuxt 4) and of the façade API (Nuxt / Nitro) that connects it to the operator’s ERP.

Peripheral control: thermal printer, QR-code reader, passport and ID-document scanner.

## The result

CAMRAIL ticketing running on kiosks in Douala and Yaoundé stations; the multi-service kiosk is being prepared for a two-kiosk pilot on the Douala–Yaoundé route.
