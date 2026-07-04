# Architecture

## Core decisions (and why)

| Decision | Choice | Why |
| --- | --- | --- |
| Backend | **Next.js full-stack** (Server Actions + Route Handlers), no separate Express | One codebase, one deploy, type-safe server calls from components. Confirmed with the owner in Phase 2. |
| Auth | **better-auth** (not hand-rolled JWT) | Battle-tested sessions, OAuth, 2FA, admin plugin, and RBAC out of the box. Sessions are revocable server-side — safer than pure JWT. |
| ORM | **Prisma 6** (deliberately pinned, not v7) | Prisma 7 changed the config/adapter model; v6 is the stable path better-auth's adapter targets. |
| Database | **SQLite in dev → PostgreSQL in prod** | Zero-setup local development. Schema written portable: no enums (string columns + constants in `src/lib/constants.ts`), JSON stored as strings. |
| Email | **Adapter pattern**: Resend when `RESEND_API_KEY` set, else dev outbox | Full auth/notification flows testable offline; emails print to terminal + save to `dev-emails/`. |
| Media storage | **Adapter pattern**: Cloudinary when `CLOUDINARY_*` set, else `public/uploads/` | Same idea — dev works instantly, production storage is a config change (`src/lib/storage.ts`). |
| Editor | **Markdown textarea + live preview** (not a block editor) | Ships fast, content is portable, renders safely. A TipTap block editor is a possible later migration — it changes the content model, so decide deliberately. |
| Content rendering | `marked` + `DOMPurify` sanitization, heading IDs for TOC, YouTube auto-embed post-sanitize | User content is never trusted; embeds are built only from validated video IDs. |

## Important patterns & gotchas

- **RBAC**: roles/permissions defined once in `src/lib/permissions.ts` (better-auth access-control). Check with `hasPermission(role, { article: ["publish"] })` from `src/lib/rbac.ts`. Roles: superadmin, admin, editor, author, moderator, premium, user.
- **Session cookie cache (5 min)**: user-table fields read from the session are cached in a signed cookie. **Never update user fields with raw Prisma** — go through `auth.api.updateUser(...)` so the cache refreshes immediately (see `src/app/settings/actions.ts`).
- **`liveWhere()`** (`src/lib/articles.ts`): the single source of truth for "publicly visible article" — handles published status, scheduled-time arrival, and expiration. Use it in every public query.
- **Mutations are Server Actions**, not REST — organized per domain in `src/lib/actions/*`. Route Handlers exist only where the browser needs a URL (uploads, RSS, polling endpoints). See [API_DOCUMENTATION.md](API_DOCUMENTATION.md).
- **Fan-out never blocks**: `notify()` and `checkAchievements()` catch internally; a failed email must never break a publish or comment.
- **Windows dev quirk**: stop the dev server before `prisma generate`/`db push` — the query-engine DLL gets file-locked.
- **First registered user** auto-becomes superadmin (hook in `src/lib/auth.ts`).

## Engines

| Engine | File | How it works |
| --- | --- | --- |
| Recommendations | `src/lib/recommendations.ts` | Multi-signal scoring: interests (+3), followed authors (+2.5), followed tags (+2), followed/read categories (+1.5), featured (+1), 14-day recency decay, log-scaled popularity. Excludes already-read; falls back to popular for cold-start. |
| Trending | `src/lib/trending.ts` | Time-windowed (day/week/month) weighted engagement over `ViewEvent`/likes/saves (1/4/6), per-category, all-time-views fallback. |
| Notifications | `src/lib/notify.ts` | Preference-aware fan-out with priorities; email channel for high/critical. |
| Achievements | `src/lib/achievements.ts` | Badge definitions seeded lazily; awarded on comment/read/save/reaction/publish events. |
| Quality/SEO | `src/lib/quality.ts` | Readiness checklist, SEO score /100, Flesch-style readability. Pure functions — run live in the editor client. |
| Digest | `src/lib/digest.ts` | Weekly top articles personalized per subscriber's interests. Manual admin trigger; cron in production. |

## Folder structure

```
prisma/
  schema.prisma          # all models (see DATABASE_SCHEMA.md)
  seed.ts                # categories + sample articles (npm run db:seed)
src/
  proxy.ts               # route protection (Next 16's middleware)
  app/
    (auth)/              # login, register, reset, 2FA pages
    (legal)/             # privacy, terms, cookies
    admin/               # dashboard + modules (articles, media, users, moderation, …)
    api/                 # route handlers (auth, media, notifications, search, export)
    articles|categories|collections|authors|trending|archive|search/   # public site
    write/               # the editor (new + edit by id)
    dashboard|saved|notifications|settings|onboarding|u/               # reader area
    feed.xml/ sitemap.ts robots.ts manifest.ts                         # SEO/distribution
  components/
    ui/                  # primitives (button, input, badge, card, …)
    layout/              # header, footer, navs, banners, bell, user menu
    editor/ comments/ articles/ admin/ settings/ saved/ home/ auth/ onboarding/
  lib/
    actions/             # ALL server actions, grouped by domain
    auth.ts auth-client.ts permissions.ts rbac.ts session.ts
    articles.ts trending.ts recommendations.ts achievements.ts notify.ts
    quality.ts digest.ts streak.ts markdown.ts media.ts storage.ts
    email/               # sendMail adapter + HTML templates
    prisma.ts site.ts constants.ts utils.ts
```
