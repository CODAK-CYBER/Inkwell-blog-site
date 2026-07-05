# Changelog

One entry per completed phase. Format: newest first. Commit hashes reference this repository's history.

## Flutterwave payment integration (2026-07-04)

- Flutterwave chosen as the sole payment provider (Stripe/Paystack references removed)
- Hosted checkout for memberships and donations (`src/lib/payments/flutterwave.ts`); customers pay via card, bank transfer, USSD, or mobile money
- `/api/payments/callback` (server-side verification + redirect notices) and `/api/payments/webhook` (`verif-hash` validated, re-verified against the API) — both run the same idempotent fulfillment keyed on `tx_ref` (`Donation.txRef` added)
- Guest donors provide an email in live mode; success/canceled/failed notices on `/membership` and `/support`
- Env: `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_SECRET_HASH`, `PAYMENT_CURRENCY`; without keys, the instant dev checkout remains

## Phases 9–11 — Admin Operations, Monetization & Analytics (2026-07-04)

**Platform operations (Phase 9)**
- Platform settings (`/admin/settings`): maintenance mode (enforced sitewide with staff bypass + notice bar), registration toggle (enforced at UI and auth API), platform-wide comments toggle, support email
- Security operations center (`/admin/security`): active sessions, 2FA adoption, sign-in activity, top IPs, warnings issued
- User management additions: formal warnings (user notified, critical priority), internal staff notes, CSV export
- Backups (`/admin/backups`): SQLite snapshots with download/delete (production: managed Postgres backups)
- Executive dashboard upgrade: online-now users, moderation queue, system health (uptime/memory/storage), revenue summary
- Activity logs: search + CSV export; admin exports API (`/api/admin/export?dataset=users|activity|revenue`)

**Monetization (Phase 10)**
- Membership platform (`/membership`): Free / Premium monthly / Premium yearly with dev checkout (payment-provider adapter seam), self-service cancel, admin comp/cancel at `/admin/memberships`
- Premium paywall: `isPremium` articles show a fading teaser + upgrade CTA for non-members; staff/authors/premium read in full
- Ads: weighted-rotation ad slots (homepage banner + below articles) with impression/click tracking, scheduling windows, AdSense-compatible HTML embeds, `/admin/ads`; **premium members see no ads**
- Affiliate links: cloaked `/go/{code}` redirects with click tracking, `/admin/affiliates`, automatic on-article disclosure
- Donations (`/support`) with messages; revenue dashboard (`/admin/revenue`): MRR, ARPU, conversion, donations, ad CTR, affiliate clicks

**Analytics & BI (Phase 11)**
- Audience-enriched view events (device/browser/language/referrer) and search result counts
- `/admin/analytics`: DAU/MAU, reader retention, read depth, engagement; audience breakdowns; top content; author performance; community stats; popular + zero-result searches; user growth
- **AI insight engine** (heuristics over real data): best publishing day, category momentum, cross-category reader affinity, read-depth guidance, content gaps from failed searches
- Traffic forecast: 6 observed weeks + 4-week linear projection

## Phases 7–8 — Community & Communication (`b1c4df4`, 2026-07-03)

**Community**
- Nested comment system: replies with collapsing, sorting (newest/oldest/top), edit/delete, comment likes, @mentions as profile links, pinned comments, staff/official badges, offensive-word filter holding comments for moderation
- Multi-type reactions (👍 ❤️ 💡 😄 🎉) replacing the plain like; social share menu (WhatsApp, X, Facebook, LinkedIn, Telegram, email, copy, native)
- Reports on comments/articles/users + `/admin/moderation` (held-comments queue, report resolution)
- Achievement system: 9 badges awarded automatically, shown on profiles and dashboard
- Verified-user system with admin toggle and checkmarks

**Communication**
- Notification engine with preference-aware fan-out and priorities; email for high/critical
- Automatic triggers: publish → followers, breaking → opted-in (email), replies, mentions, new followers, achievements
- Header bell + `/notifications` center (filters, mark read, delete)
- Announcement center with levels, audience targeting, expiry, sitewide banner
- Weekly digest generator personalized per interests + `/admin/communications` stats

## Phase 4 — Media, Editor v2 & Publishing Infrastructure (`0e7abd0`, 2026-07-02)

- Digital Asset Management: uploads (image/video/audio/document) with validation, sha256 duplicate detection, folders, favorites, trash/restore, bulk ops, storage stats; usage tracking protects in-use assets; asset-intelligence report (unused/oversized/most-used)
- Storage adapter: local disk in dev, Cloudinary via env
- Editor v2: media picker, autosave (25s + Ctrl+S), version history with restore, 6 content templates, word/char/reading-time counts, device-width preview, fullscreen, YouTube auto-embed
- Quality assurance: live readiness checklist, SEO score /100, readability rating
- Extended pipeline: pending → fact check → SEO review → approved (+ needs-revision loops), all recorded in status history
- Publishing flags: breaking news (sitewide banner), premium, sponsored, scheduled expiration; per-article interaction toggles
- Distribution: RSS feed, `/archive` by year/month, editorial calendar, per-article analytics dashboard

## Phase 3 — Personalization, Trending & Discovery (`2209252`, 2026-07-02)

- Trending engine (time-windowed weighted views/likes/saves) + `/trending`
- Multi-signal recommendation engine excluding already-read content
- Personalized homepage: continue reading (progress bars), recommended, trending, latest-in-interests, editor's picks, saved, suggested authors/categories
- Reading experience: scroll progress with milestone saving, table of contents, font-size/width controls, related articles
- Reading lists: custom lists, archive, move, search within saved
- Search: filters (category/tag/author/date), search history, trending searches, live suggestions
- `/authors` directory, profile article grids + stats, `/collections` hubs (admin + public), `/dashboard` with streaks and account progress, `/settings/interests`

## Phase 2 — Authentication, Articles & Admin (`495407a`, 2026-07-01)

- better-auth + Prisma: email/password with verification, password reset, remember me, 2FA with backup codes, env-gated Google/GitHub/Apple OAuth
- RBAC with 7 roles; first registered account bootstraps to superadmin
- Onboarding wizard (topics, formats, notifications, frequency, profile)
- Settings suite: profile, account, security (sessions, login history, 2FA), notifications, privacy, connected accounts, data export, account deletion
- Engagement foundation: bookmarks, likes, reading history, follows; public profiles at `/u/[username]`
- Email system: 7 transactional templates; Resend with dev outbox fallback
- Pulled forward: article model + markdown editor + approval workflow, database-backed site, admin dashboard (articles, categories, tags, users, activity logs)

## Phase 1 — Foundation (`f39779b`, 2026-07-01)

- Next.js 16 + TypeScript + Tailwind v4 + Framer Motion scaffold
- Design system: editorial palette with dark mode, Lora/Inter/Geist Mono typography, reusable UI kit
- Layout: sticky header, main + mobile nav, five-column footer, Ctrl+K search dialog
- Error pages (404/500/global), skeleton loading, cookie consent banner
- SEO foundation: metadata, sitemap, robots, PWA manifest
