# Backlog

Jordan Tukum's portfolio on Orbit (`orbit` branch). Last updated: 2026-11-02.

**Status:** done / next / pending owner.

## Done

- J1 to J4: Orbit rebuilt with Jordan's profile and nine projects, bilingual FR/EN, contact form on a Pages Function, project imagery, Open Graph images, bilingual alt text.
- Final review and fix round: client name guarded by hash, deploy config in `wrangler.jsonc`, e2e counts derived from content, README, font licence.

## Next: J5, deploy (https://jordan-tukum.pages.dev)

1. ✅ Owner: Turnstile widget created for `jordan-tukum.pages.dev`; its public site key is committed in `app/lib/turnstile-key.ts`.
2. Owner: set the secrets `RESEND_API_KEY` and `TURNSTILE_SECRET` for both the production and preview environments (`npx wrangler pages secret put <NAME> --project-name jordan-tukum`, plus `--env preview`). `CONTACT_TO` comes from `wrangler.jsonc`.
3. Owner: in Pages > Settings > Builds, set the build command to `npm run build` (the output directory comes from `wrangler.jsonc`, Node from `.node-version`).
4. Controller: push a squashed preview branch. Check it in both languages: `GET /api/contact` returns 405, a real contact message arrives in the inbox, the social card previews, and the owner checks it on phones.
5. Controller, after the owner's OK: squash-merge `orbit` into `main` and push. The `orbit` branch history is never pushed.

## Pending the owner's review

- `content/OPEN-QUESTIONS.md`.
- French UI wording (`app/i18n/strings.ts`).
- The Orbit project write-up (both languages).
- The imagery contact sheets.
