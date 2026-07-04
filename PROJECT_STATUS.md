# Project Status

_Last updated: 2026-07-04 · Latest commit: `b1c4df4` (Phases 7–8)_

## Where the project stands

**Complete: Phases 1, 2, 3, 4, 7, 8** — plus the core of Phase 9 (admin dashboard) pulled forward, and most of Phases 5 (homepage/discovery) and 6 (search) covered along the way. See [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) for the full phase map.

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

## Environment & operational notes

- **Email**: dev mode logs emails to terminal + `dev-emails/`. Set `RESEND_API_KEY` for real delivery. Free tier only delivers to your own Resend account email until a domain is verified.
- **Media storage**: local `public/uploads/` in dev. Set `CLOUDINARY_*` keys before deploying to serverless hosting.
- **Database**: SQLite (`prisma/dev.db`). Swap `datasource` provider + `DATABASE_URL` to Postgres (Neon/Supabase) for production; schema is written to be portable (no enums, string-encoded JSON).
- **Cron needed in production** for: weekly digest send, scheduled-article flip (currently handled by query-time `liveWhere()`), expired-article cleanup.
- **Test data in dev DB**: superadmin `webdevchinonso001@gmail.com`, demo user `reader-b@test.local` (@readerb), a demo comment thread, and one flagged comment in the moderation queue.

## Known gaps / deferred by design

- Push notifications → Phase 14 (PWA)
- Block-based editor (drag-drop blocks, slash commands, math) → would require TipTap migration; discuss before committing
- Payment/membership enforcement of `isPremium` articles → Phase 10
- Traffic sources / device / country analytics → Phase 11
- Malware scanning, backups, content locking → Phase 13
- Drag-and-drop category ordering & calendar scheduling → numeric ordering + editor scheduling work today

## Next steps (recommended order)

1. **Phase 10 — Revenue**: membership plans, premium paywall (flag already exists), Stripe/Paystack, sponsored placements
2. **Phase 11 — Analytics**: extend ViewEvent with referrer/device/country, admin analytics module
3. **Phase 12 — SEO polish**: structured data (JSON-LD), OG image generation, redirect manager
4. **Phases 13–15 — Hardening & launch**: rate limiting beyond auth, backups, PWA, tests, CI/CD, deploy (Vercel + Neon + Cloudinary + Resend domain)
