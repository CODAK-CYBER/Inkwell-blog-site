# API Documentation

The app is Next.js full-stack: **most mutations are Server Actions** (type-safe functions, not HTTP endpoints), and **Route Handlers** exist only where the browser needs a real URL. All endpoints enforce auth/RBAC server-side.

## HTTP endpoints (Route Handlers)

### Auth
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/auth/[...all]` | GET/POST | Entire better-auth surface: `sign-up/email`, `sign-in/email`, `sign-out`, `verify-email`, `request-password-reset`, `reset-password`, `two-factor/*`, `update-user`, `change-email`, `change-password`, `delete-user`, admin ops, OAuth callbacks (`/callback/google` etc.). Rate-limited (e.g. 5 sign-in attempts / 5 min). |

### Media
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/media/upload` | POST | Multipart upload (max 20 files). Validates MIME/size per kind, sha256 duplicate detection (returns existing asset with `duplicate: true`), image dimension extraction. Requires `media.upload` permission. |
| `/api/media/list` | GET | Asset listing for the editor picker. Params: `kind`, `q`. Requires `media.upload`. |

### Notifications
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/notifications` | GET | Bell summary: `{ unread, notifications[≤10] }`. 401 when signed out. |

### Search
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/search/meta` | GET | `{ recent[] }` (per-user) + `{ trending[] }` (global, 7d) queries. |
| `/api/search/suggest` | GET | `?q=` → up to 5 live title suggestions. |

### Account & distribution
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/account/export` | GET | GDPR-style JSON export of everything stored about the signed-in user. |
| `/feed.xml` | GET | RSS 2.0 feed (30 latest live articles). |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | GET | Generated SEO/PWA files. |

### Monetization & admin ops
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/go/[code]` | GET | Cloaked affiliate redirect, click-tracked. |
| `/api/ads/click/[id]` | GET | Ad click-through tracking → advertiser redirect. |
| `/api/payments/callback` | GET | Flutterwave return URL — verifies the transaction server-to-server, fulfills idempotently, redirects with success/canceled/failed notice. |
| `/api/payments/webhook` | POST | Flutterwave webhook (`verif-hash` checked against `FLUTTERWAVE_SECRET_HASH`); re-verifies then fulfills — guarantees delivery even if the customer never returns. |
| `/api/admin/export` | GET | Admin CSV exports: `?dataset=users\|activity\|revenue`. |
| `/api/admin/backups/[name]` | GET | Download a database backup (admin, allowlisted filenames). |

## Server Actions (by module in `src/lib/actions/`)

| Module | Actions |
| --- | --- |
| `articles.ts` | `saveArticle` (create/update + version snapshot + media-usage sync), pipeline transitions (`submitForReview`, `requestChanges`, `moveToFactCheck`, `moveToSeoReview`, `approveArticle`, `publishArticle` (+follower fan-out), `scheduleArticle`, `unpublishArticle`, `archiveArticle`, `trashArticle`, `restoreArticle`, `deleteArticleForever`), `toggleFeatured`, `togglePinned`, `duplicateArticle`, `listVersions`, `getVersion` |
| `comments.ts` | `addComment` (word filter, mentions, reply/author notifications), `editComment`, `deleteComment`, `setCommentStatus`, `togglePinComment`, `toggleCommentReaction`, `reportTarget` |
| `engagement.ts` | `toggleLike(slug, type)` (multi-reaction), `toggleBookmark`, `recordReading(slug, progress)`, `toggleFollow` (+follower notification), reading lists (`createReadingList`, `renameReadingList`, `deleteReadingList`, `moveBookmarkToList`, `toggleArchiveBookmark`, `removeBookmark`) |
| `media.ts` | `updateMediaMeta`, `toggleFavoriteMedia`, `trashMedia` (usage-protected), `restoreMedia`, `deleteMediaForever`, folders (`createMediaFolder`, `renameMediaFolder`, `deleteMediaFolder`, `moveMediaToFolder`) |
| `taxonomy.ts` | Categories (`saveCategory`, `deleteCategory`), tags (`createTag`, `deleteTag`, `mergeTags`), collections (`saveCollection`, `deleteCollection`, `toggleArticleInCollection`) |
| `moderation.ts` | `resolveReport`, `setUserVerified`, announcements (`saveAnnouncement` + audience fan-out, `toggleAnnouncement`, `deleteAnnouncement`), `triggerWeeklyDigest` |
| `notifications.ts` | `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification`, `clearReadNotifications` |
| `billing.ts` | `subscribe` / `donate` (return a Flutterwave `checkoutUrl` when keys are set; instant dev checkout otherwise), `cancelSubscription`, `adminSetSubscription` (comp/cancel) |
| `ads.ts` | `saveAd`, `toggleAd`, `deleteAd`, `saveAffiliateLink`, `deleteAffiliateLink` |
| `system.ts` | `updateSettings` (maintenance/toggles), `createBackup`, `listBackups`, `deleteBackup` |
| `settings/actions.ts` (app dir) | `updateProfile`, `updateLocale`, `updateNotifications`, `updatePrivacy`, `updateInterests`, `becomeAuthor` — user fields go through `auth.api.updateUser` (cookie-cache refresh) |
| `onboarding/actions.ts` (app dir) | `completeOnboarding` |

## Auth model for external consumers

There is no public REST API yet (planned as "API syndication" in later phases). Everything is session-cookie authenticated. If an external API is needed, better-auth's JWT/bearer plugins can expose token auth without re-architecting.
