# Database Schema

Source of truth: [`prisma/schema.prisma`](prisma/schema.prisma). SQLite in dev, PostgreSQL-portable (no enums — allowed values live in `src/lib/constants.ts`; JSON stored as strings).

## Auth & identity (better-auth core + extensions)

| Model | Purpose | Notable fields |
| --- | --- | --- |
| `User` | Account + profile + preferences | `role`, `banned/banReason/banExpires`, `twoFactorEnabled`, `verified`, profile (`bio`, `website`, `location`, `coverImage`, `socialLinks` JSON), prefs (`profileVisibility`, `preferredContentTypes` JSON, `emailFrequency`, `onboardingComplete`), locale (`language`, `timezone`) |
| `Session` | Revocable sessions | `token`, `ipAddress`, `userAgent`, `impersonatedBy` |
| `Account` | Credential + OAuth links | `providerId`, `password` (scrypt), OAuth tokens |
| `Verification` | Email/reset tokens | — |
| `TwoFactor` | TOTP secrets + backup codes | — |
| `LoginEvent` | Login history (device recognition, alerts) | `ipAddress`, `userAgent` |

## Content

| Model | Purpose | Notable fields |
| --- | --- | --- |
| `Article` | The core content unit | `status` pipeline (draft→pending→needs_revision→fact_check→seo_review→approved→scheduled→published→archived→trashed), flags (`featured`, `pinned`, `isBreaking`, `isPremium`, `isSponsored`), controls (`engagementEnabled`, `allowComments`), SEO (`seoTitle`, `seoDescription`, `canonicalUrl`, `focusKeyword`), timing (`publishedAt`, `scheduledFor`, `expiresAt`), `views`, `readingTime` |
| `ArticleVersion` | Snapshot per save (cap 20) | restore support in editor |
| `ArticleStatusHistory` | Audit trail of pipeline transitions | `fromStatus`, `toStatus`, `userId` |
| `Category` | Hierarchical taxonomy | `parentId` self-relation, `icon`, `image`, `sortOrder`, SEO fields |
| `Tag` / `ArticleTag` | Tags (m:n) | merge support in admin |
| `Collection` / `CollectionItem` | Curated cross-category hubs | `featured`, `sortOrder` |

## Media (DAMS)

| Model | Purpose | Notable fields |
| --- | --- | --- |
| `Media` | Every uploaded asset | `kind` (image/video/audio/document), `hash` (sha256 dedupe), dimensions, `alt/caption/credit/tags`, `favorite`, `deletedAt` (soft delete), `folderId` |
| `MediaFolder` | Organization | files survive folder deletion (SetNull) |
| `MediaUsage` | Which articles reference which assets | synced on every article save; blocks deletion of in-use assets |

## Personalization & engagement

| Model | Purpose |
| --- | --- |
| `UserInterest` | Chosen topics (category slugs) — powers recommendations & digests |
| `Follow` | Polymorphic follows: `targetType` author/category/tag + `targetKey` |
| `Like` | One reaction per user/article; `type` = like/love/insightful/funny/celebrate |
| `Bookmark` | Saved articles; `listId` (reading list), `archived` |
| `ReadingList` | Custom lists (name, description, `isPublic`) |
| `ReadingHistory` | Per-article `progress` (0–1) + `readAt` — continue-reading, streaks, completion analytics |
| `ViewEvent` | Timestamped views (nullable `userId`) — trending windows, unique readers |
| `SearchHistory` | Queries per user — recent + trending searches |

## Community (Phase 7)

| Model | Purpose |
| --- | --- |
| `Comment` | Nested via `parentId`; `status` visible/flagged/hidden, `pinned`, `isOfficial`, `editedAt` |
| `CommentReaction` | Comment likes (composite PK) |
| `Report` | Reports on comments/articles/users; `status` open/resolved/dismissed |
| `Badge` / `UserBadge` | Achievement definitions + awards |

## Communication (Phase 8)

| Model | Purpose |
| --- | --- |
| `Notification` | In-app inbox; `type`, `priority` (critical/high/medium/low), `read` |
| `NotificationPreferences` | Per-user channel + type toggles (email/in-app/push, digest, breaking, follower, login alerts) + per-category topics JSON |
| `Announcement` | Admin broadcasts; `level`, `audience`, `showBanner`, `expiresAt` |

## Platform

| Model | Purpose |
| --- | --- |
| `ActivityLog` | Audit trail of admin/editorial actions |
| `Subscription` | Membership scaffold (plan, status, provider) — activates in Phase 10 |
| `LoyaltyTransaction` | Points scaffold — future gamification |
| `Referral` | Referral codes scaffold |

## Conventions

- IDs are cuid strings; better-auth core tables use its own ID generation.
- Deletion strategy: **soft delete** where recovery matters (Media `deletedAt`, Article `trashed` status, Comment `hidden`), cascade where a parent owns children (user → sessions/comments, article → versions/usage).
- Articles reference engagement rows by `articleSlug` (historical); content tables use `articleId` FKs.
