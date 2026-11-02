---
slug: schulyf
title: "SchuLyf"
year: 2026
discipline: "Education"
category: "Education · Independent project"
summary: "University administration: admissions, HMAC-signed receipts verifiable online, exam access based on payment standing."
role: "Design & development"
timeline: "Apr — Jul 2026"
team: "Independent project for Cameroonian universities"
platforms: "Laravel 13, Inertia, Vue 3, PrimeVue, Tailwind CSS, Pest"
order: 7
featured: false
illustrative: true
accent:
  from: "#101426"
  to: "#252d5c"
cover:
  src: /projects/schulyf/cover.avif
  width: 1600
  height: 1200
  alt: "Illustrative mock-up: the admissions board, with applications sorted into received, under review and admitted, above a table of instalments and exam access."
stats:
  - value: "580+"
    label: "Pest tests, including browser tests"
  - value: "50"
    label: "Documentation pages"
  - value: "CI"
    label: "Lint and tests on every push"
sections:
  - image:
      src: /projects/schulyf/section-1.avif
      width: 1600
      height: 1000
      alt: "Illustrative mock-up: a payment receipt with its signature and QR code, next to the public page that confirms the receipt is valid."
    lead: "Verifiable receipt."
    caption: "One signed receipt that anyone can check online: no more disputes over a lost or forged slip."
architecture:
  - label: "Interface"
    description: "Inertia + Vue 3, PrimeVue, Tailwind CSS v4"
  - label: "Back-end"
    description: "Laravel 13, Fortify authentication, typed routes (Wayfinder)"
  - label: "Receipts"
    description: "Single HMAC-signed PDF receipt + public verification endpoint"
keyDecision: "One receipt, HMAC-signed and verifiable through a public link: a lost or forged receipt is no longer a source of dispute."
links:
  - label: "github.com/kiri1101/student-management-system"
    url: "https://github.com/kiri1101/student-management-system"
---
## The problem

In many universities, admissions run on paper files, payments on hand-carried bank slips and announcements on word of mouth. A lost or forged receipt becomes a source of dispute.

## The fix

Full design and development: data model, back end, interface, tests and documentation.

Online admissions triaged by student-affairs officers; an admitted applicant becomes a student.

Instalment payments: payment standing computed live, with exam access and deferrals handled accordingly.

## The result

Public, documented and tested source code, available on GitHub.
