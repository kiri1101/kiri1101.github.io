# Open questions for the owner

Jordan’s content comes from `legacy/content/*.ts`. Where Orbit’s model needs something the source does not have, the site shows a neutral value and the question is here. Nothing below has been invented as a fact.

## A. Wording to validate (the Orbit project, `orbit-portfolio`) — owner to validate wording

The whole write-up is mine, from the Orbit spec and the measured results in the Orbit backlog. Please read both languages and correct anything that is not true of you.
- Framing: "personal project", "built to answer a client’s bid" (the client is not named). Is "personal project" the right team line?
- Wording I invented, to confirm: category “Web · Portfolio template” and team “Personal project”.
- Role: "Design & development" (the same wording as your other self-run projects).
- Period: "2026" only. Do you want a month range?
- Problem paragraph: the 29 to 57 mobile Lighthouse scores come from the spec’s study of other portfolios (not named). Keep or drop? (The earlier claim about competitors keeping content only in the canvas had no source and was removed.)
- Figures: Lighthouse mobile 98 to 100; 3D scene about 50 fps on an Intel HD 4600 (2013 laptop); CLS 0. Source: `D:Freelance.superpowerssdd6-10-23-orbit-portfolioinal-verify-report.md` (home measured 98, case study 100, worker scene 44.5 to 53.2 fps). “98–100” and “≈ 50 fps” are rounded from that. The result paragraph adds TBT under 150 ms. All are from the backlog’s measurements on your own machine, not on a public tool.
- Last sentence: "My own pages are built on this template" (true of this site).
- No link: the template’s repository is private. Do you want a link to a live demo or to the repository?
- Architecture and key decision: taken from the spec (prerendered static HTML, 3D loaded after interactivity and rendered in a Web Worker, Markdown content, Cloudflare hosting).

## B. Fields Orbit has and the source lacks

1. **Availability** (Orbit’s "Availability" fact): not in the source, so it is not shown. Add one if you want it.
2. **Booking link** (Orbit’s "Book a 20-minute call"): the source has none. The slot now links to WhatsApp instead. Do you have a calendar link?
3. **Reply-time promise and newsletter line**: removed from the live copy (no source). Suggestions if you want them back: “I reply within two working days”, “No newsletters, ever.” Success note now only says “I’ll reply by email.”
4. **Discipline** (the small line "Public sector · 2023" on cards and case studies): the source has only a sector. I use the sector’s first part (before the "·") as the discipline and the whole sector as the category. Change if you want another wording.
5. **Project year**: taken as the first year of the period (e.g. "Dec 2025 — 2026" counts as 2025). This drives the "2023 – 2026" range.
6. **Case-study figures**: the source’s "quality" items (three per project) are shown as figures. Several are labels, not numbers ("Docker", "OpenSpec", "ADR", "CI"). Do you want real numbers for some?
7. **Phone figure labels** (short labels for phones): none in the source, so phones show the full labels.

## C. Source data the design has no place for (not shown)

- **Project badges** (e.g. "Live", "≈ 900 commits", "CAMRAIL: deployed in stations", "280+ tests", "Tested API contract", "ICAO / CCAA", "Live demo", "Android", "Mobile Money", "Public code", "Real-time"): Orbit’s case study has no badge row. Most are covered by the links and figures. Tell me which, if any, to add.
- **Test counts** (`testCount`): not shown; some appear in figures.
- **Other projects** (`legacy/content/other-projects.ts`): not part of the nine; not shown.
- **Repository link** of the old site and per-project "code" / "demo" kinds: shown only as a link label; the kind (live / demo / code) is not distinguished.
- **Education badges** ("GPA 3.27/4", "60/60 credits", "degree being issued") are shown as plain text after the school.

## D. Decisions I made (design, not facts)

- The monogram on the orb and the About portrait is "JT" (first two initials of "Jordan Tukum Folem").
- "Years of experience" is computed from the earliest role (2020, FORAMA and HYDRAC), so it reads 6 years in 2026, while the old site’s card says "5+". Which do you prefer?
- The hero sub-line (“Lead Full Stack Developer at ADWA SARL. Based in Douala, Cameroon.”) is composed by me from the profile’s current role and location.
- The contact placeholders (“Que construisez-vous, et où êtes-vous bloqué ?”, “Votre nom”, “vous@entreprise.com”) and the lead (“Parlez-moi du problème…”) are Orbit’s form copy, translated; confirm.
- The “5+” years card now shows the computed value (“6+” in 2026); the “10” sectors card is the length of the sector list. Keep “5+” instead?
- The hero pills are the first three sectors and a "+".
- About: all five method items are shown (Orbit showed three principles); skills, sectors and clients are listed in the same rows as the experience.
