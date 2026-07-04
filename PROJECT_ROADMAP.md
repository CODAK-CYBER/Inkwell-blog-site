# Project Roadmap — All Phases

Status legend: ✅ complete · 🟡 partially covered by other phases · ⬜ not started

| # | Phase | Status | Notes |
| --- | --- | --- | --- |
| 1 | Foundation & System Architecture | ✅ | Design system, layout, nav, search dialog, error pages, cookie consent, SEO base |
| 2 | Authentication & User Management | ✅ | better-auth, verification, 2FA, RBAC (7 roles), settings, sessions, admin user mgmt |
| 3 | Categories & Personalization | ✅ | Interests, follows, recommendation + trending engines, personalized homepage, dashboard |
| 4 | Blog & Article Management | ✅ | Editor v2, DAMS, editorial pipeline, publishing flags, versions, QA checklist |
| 5 | Homepage & Discovery | 🟡 | Hero, breaking, trending, editor's picks, recommended, authors, collections all live; podcasts/sponsored slots pending Phase 10 |
| 6 | Search Engine | 🟡 | Live suggestions, filters (category/tag/author/date), history, trending searches; Meilisearch upgrade optional later |
| 7 | Community Features | ✅ | Comments, reactions, reports, achievements, verified users, share menu |
| 8 | Notifications | ✅ | Notification center, event fan-out, announcements, weekly digest; push pending Phase 14 |
| 9 | Admin Dashboard | 🟡 | Dashboard, articles, categories, tags, collections, media, users, moderation, calendar, communications, activity logs live; ads/analytics/revenue modules pending Phases 10–11 |
| 10 | Revenue System | ⬜ | Memberships, premium paywall (flag exists), ads, sponsorships, donations |
| 11 | Analytics | ⬜ | Per-article analytics exists; needs traffic sources, devices, countries, admin suite |
| 12 | SEO System | 🟡 | Sitemap, robots, OG/Twitter meta, canonical, SEO score live; structured data + redirect manager pending |
| 13 | Performance & Security | 🟡 | Rate limiting (auth), soft deletes, audit logs, file validation live; caching, backups, hardening pending |
| 14 | Mobile Experience & PWA | ⬜ | Manifest exists; service worker, offline reading, push notifications pending |
| 15 | Testing & Deployment | ⬜ | Unit/integration tests, CI/CD, production deploy (Vercel + Neon + Cloudinary) |

## Phase details (original scope)

The full feature specifications for each phase live in the conversation history and PRs; each phase's delivered scope is summarized in [CHANGELOG.md](CHANGELOG.md). Where the delivered scope deliberately deviates (e.g., markdown editor instead of block editor), the decision and reasoning are recorded in [ARCHITECTURE.md](ARCHITECTURE.md).
