---
slug: orbit-portfolio
title: "Orbit"
year: 2026
discipline: "Web"
category: "Web · Portfolio template"
summary: "A React portfolio template built for a client bid: a 3D orb, a spiral project gallery and case-study pages, that stay fast on a phone."
role: "Design & development"
timeline: "2026"
team: "Personal project"
platforms: "React 19, React Router, three.js, Cloudflare"
order: 9
featured: false
accent:
  from: "#14101c"
  to: "#2b1f45"
cover:
  src: /projects/orbit-portfolio/cover.avif
  width: 1600
  height: 1200
  alt: "The Orbit demo: the project gallery floating in 3D space on a desktop browser, and the same view on a phone."
stats:
  - value: "98–100"
    label: "Mobile Lighthouse score"
  - value: "≈ 50 fps"
    label: "3D scene in a worker on an Intel HD 4600"
  - value: "0"
    label: "Layout shift (CLS)"
sections:
  - image:
      src: /projects/orbit-portfolio/section-1.avif
      width: 1600
      height: 1000
      alt: "The Orbit demo: a case-study page, beside the moment the light orb opens onto the starry background."
    lead: "Case study and transition."
    caption: "Each project opens as a fast case-study page; between the hero and the gallery, the orb opens onto the galaxy."
architecture:
  - label: "Browser"
    description: "Prerendered HTML for every route; the content is real HTML, even without WebGL"
  - label: "3D scene"
    description: "three.js loaded after the page is interactive, rendered in a Web Worker (OffscreenCanvas), main-thread fallback"
  - label: "Content"
    description: "One Markdown file per project; order, counts and year ranges computed"
  - label: "Hosting"
    description: "Static on Cloudflare, plus a small function for the contact form, protected by Turnstile"
keyDecision: "Prerender every route to static HTML and load the 3D only once the page is interactive: the first paint stays plain HTML, which keeps the mobile Lighthouse score above 90."
links: []
---
## The problem

A client asked, for a bid, for a live example of a polished React portfolio. The premium portfolios I studied are striking but slow on phones, with mobile Lighthouse scores of 29 to 57. I wanted the same effect with an instant load.

## The fix

Designed and built end to end: an orb that morphs into a monogram and then a ring on scroll, a black-hole transition, then a spiral project gallery over a deep-space photograph, with a list view.

React 19 with React Router in framework mode, every route prerendered to static HTML. The three.js scene loads after the page is interactive and renders from a Web Worker through OffscreenCanvas, with a main-thread fallback and adaptive quality.

One Markdown file per project: adding, editing or removing a project needs no code change, and counts and year ranges are computed.

## The result

A portfolio that scores 98 to 100 on mobile Lighthouse performance, with total blocking time (TBT) under 150 ms and a CLS of 0, and whose 3D scene holds about 50 frames per second on a 2013 Intel HD 4600. My own pages are built on this template.
