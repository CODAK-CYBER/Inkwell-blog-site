# Inkwell — Premium Publishing Platform

A full-featured, community-driven publishing platform built with Next.js — think Medium meets a modern newsroom CMS. Every reader gets a personalized experience; every writer gets professional publishing tools; every admin gets a real editorial operation.

> 📚 **Documentation:** [Status](PROJECT_STATUS.md) · [Roadmap](PROJECT_ROADMAP.md) · [Architecture](ARCHITECTURE.md) · [Database](DATABASE_SCHEMA.md) · [API](API_DOCUMENTATION.md) · [Changelog](CHANGELOG.md)

## Highlights

- **Personalized homepage** — recommendations, continue-reading, trending, and interest-based feeds per user
- **Full editorial pipeline** — draft → review → fact check → SEO review → approved → published/scheduled, permission-controlled with audit history
- **Writing studio** — markdown editor with live preview, media picker, autosave, version history, templates, SEO scoring, and a pre-publish readiness checklist
- **Digital asset management** — uploads with duplicate detection, folders, usage tracking, and asset-intelligence reports
- **Community** — nested comments with @mentions, multi-type reactions, achievements, follows, reading lists, and moderation tools
- **Communication** — in-app notification center, event-driven fan-out (new articles, replies, mentions, breaking news), announcements, and weekly digests
- **Complete auth** — email/password with verification, social login (env-gated), 2FA, RBAC with 7 roles, session/device management

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + Framer Motion |
| Database | Prisma 6 — SQLite in dev, PostgreSQL-ready for production |
| Auth | better-auth (sessions, OAuth, 2FA, admin plugin, custom RBAC) |
| Email | Resend (dev fallback: local outbox in `dev-emails/`) |
| Storage | Local disk in dev; Cloudinary via env keys |
| Payments | Flutterwave (cards, bank transfer, USSD, mobile money); instant dev checkout without keys |

## Getting started

```bash
npm install
cp .env.example .env       # fill in BETTER_AUTH_SECRET (any 32+ char string)
npx prisma db push         # create the SQLite database
npm run db:seed            # categories + sample articles
npm run dev                # http://localhost:3000
```

**The first account you register automatically becomes superadmin.** Verification emails print to the terminal (and save to `dev-emails/`) until you add a `RESEND_API_KEY`.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:seed` | Seed categories and sample articles |
| `npm run lint` | ESLint |

### Environment

See [.env.example](.env.example) for all options: Resend (email), Google/GitHub/Apple OAuth, Cloudinary (media storage), and Flutterwave (payments). Everything works in dev with only `BETTER_AUTH_SECRET` set.

## Key entry points

| URL | What it is |
| --- | --- |
| `/` | Personalized homepage (general homepage for guests) |
| `/write` | Writing studio (authors and above) |
| `/admin` | Admin dashboard — articles, media, moderation, users, announcements… |
| `/dashboard` | Reader dashboard — stats, streak, achievements |
| `/feed.xml` | RSS feed |
