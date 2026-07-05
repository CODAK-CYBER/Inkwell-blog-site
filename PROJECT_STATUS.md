# Project Status

_Last updated: 2026-07-04 · Phases 9–11 complete_

## Where the project stands

**Complete: Phases 1, 2, 3, 4, 7, 8, 9, 10, 11** — with Phases 5 (homepage/discovery) and 6 (search) substantially covered along the way. Remaining: 12 (SEO polish), 13 (performance/security hardening), 14 (PWA), 15 (testing/deployment). See [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).

The platform is a working product: readers register, personalize, read, react, comment, and get notified; authors write through a professional editor and editorial pipeline; admins run content, media, users, moderation, and communications from a real dashboard.

## What works today (verified end-to-end)

| Area | Status |
| --- | --- |
| Auth (email+verification, 2FA, RBAC, sessions, social-ready) | ✅ Verified |
| Onboarding wizard → personalized homepage | ✅ Verified |
| Article publishing + editorial pipeline (fact check → SEO review → approved) | ✅ Verified |
| Media library, uploads, duplicate detection, usage tracking | ✅ Verified |
| Editor: autosave, versions+restore, media picker, SEO score, templates | ✅ Verified |
| Recommendations, trending, reading streaks, dashboard | ✅ Verified |
| Comments (nested, mentions, word filter), reactions, reports | ✅ Verified |
| Notification center + fan-out (publish/reply/mention/follower/breaking) | ✅ Verified |
| Announcements + sitewide banner, weekly digest | ✅ Verified |
| RSS, sitemap, archive, editorial calendar, per-article analytics | ✅ Verified |
| Maintenance mode, registration/comments toggles (enforced) | ✅ Verified |
| Security center, warnings/notes, backups, CSV exports | ✅ Verified |
| Memberships + premium paywall + ad-free for members | ✅ Verified (dev checkout) |
| Ads (rotation + impression/click tracking), affiliates (/go/*), donations | ✅ Verified |
| Analytics suite, AI insights, traffic forecast | ✅ Verified |

## Environment & operational notes

- **Email**: dev mode logs emails to terminal + `dev-emails/`. Set `RESEND_API_KEY` for real delivery. Free tier only delivers to your own Resend account email until a domain is verified.
- **Media storage**: local `public/uploads/` in dev. Set `CLOUDINARY_*` keys before deploying to serverless hosting.
- **Database**: SQLite (`prisma/dev.db`). Swap `datasource` provider + `DATABASE_URL` to Postgres (Neon/Supabase) for production; schema is written to be portable (no enums, string-encoded JSON).
- **Cron needed in production** for: weekly digest send, scheduled-article flip (currently handled by query-time `liveWhere()`), expired-article cleanup.
- **Test data in dev DB**: superadmin `webdevchinonso001@gmail.com`, demo user `reader-b@test.local` (@readerb), a demo comment thread, and one flagged comment in the moderation queue.

## Known gaps / deferred by design

- **Payments**: Flutterwave is fully integrated (hosted checkout, verification callback, webhook). Until `FLUTTERWAVE_SECRET_KEY`/`FLUTTERWAVE_SECRET_HASH` are set in `.env`, checkout runs in instant dev mode without charging. Recurring billing note: Flutterwave charges are one-time — memberships last their paid period and members re-pay to renew (Flutterwave Payment Plans can automate renewals later)
- Push notifications → Phase 14 (PWA)
- Country-level analytics → needs a geo-IP service
- Block-based editor (drag-drop blocks, slash commands, math) → would require TipTap migration; discuss before committing
- Malware scanning for uploads, content locking → Phase 13
- Maintenance mode is a UX curtain (page data still present in the RSC payload) — real access control remains role-based
- Custom role builder → roles are code-defined in `src/lib/permissions.ts` (adding one is a small edit, not a UI flow)

## Next steps (recommended order)

1. **Phase 12 — SEO polish**: structured data (JSON-LD), OG image generation, redirect manager
2. **Phase 13 — Hardening**: broader rate limiting, upload scanning, caching, geo-IP
3. **Phase 14 — PWA**: service worker, offline reading, push notifications
4. **Phase 15 — Launch**: Flutterwave live keys + webhook URL, tests, CI/CD, deploy (Vercel + Neon + Cloudinary + Resend domain)
