"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { syncMediaUsage } from "@/lib/media";
import { readingTime, slugify } from "@/lib/utils";

// ----------------------------------------------------------------
// Editorial pipeline (each transition permission-controlled):
//   draft → pending → [needs_revision ⇄] fact_check → seo_review →
//   approved → published/scheduled → archived | trashed
//   author:  draft/needs_revision → pending (submit for review)
//   editor+: move through review stages, publish, schedule, feature, pin
//   admin/superadmin: everything, including trash/restore/hard delete
// Every transition is recorded in ArticleStatusHistory.
// ----------------------------------------------------------------

export interface ArticleInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  categoryId?: string;
  tags: string[]; // tag names
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  focusKeyword?: string;
  isBreaking?: boolean;
  isPremium?: boolean;
  isSponsored?: boolean;
  engagementEnabled?: boolean;
  allowComments?: boolean;
  expiresAt?: string | null;
}

async function requireSession() {
  const session = await getServerSession();
  if (!session) throw new Error("Not signed in");
  return session;
}

function revalidateContent() {
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/admin/articles");
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "untitled";
  let candidate = root;
  for (let i = 2; ; i++) {
    const clash = await prisma.article.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${root}-${i}`;
  }
}

async function syncTags(articleId: string, tagNames: string[]) {
  const clean = [...new Set(tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  await prisma.articleTag.deleteMany({ where: { articleId } });
  for (const name of clean) {
    const slug = slugify(name);
    const tag = await prisma.tag.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
    });
    await prisma.articleTag.create({ data: { articleId, tagId: tag.id } });
  }
}

/** Create or update a draft. Authors may only edit their own articles. */
export async function saveArticle(input: ArticleInput, id?: string) {
  const session = await requireSession();
  const role = session.user.role;
  if (!hasPermission(role, { article: ["create"] })) {
    return { error: "You don't have permission to write articles. Become an author in Settings." };
  }

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const data = {
    title: input.title.trim() || "Untitled",
    excerpt: input.excerpt.trim(),
    content: input.content,
    coverImage: input.coverImage?.trim() || null,
    categoryId: input.categoryId || null,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    canonicalUrl: input.canonicalUrl?.trim() || null,
    focusKeyword: input.focusKeyword?.trim() || null,
    isBreaking: input.isBreaking ?? false,
    isPremium: input.isPremium ?? false,
    isSponsored: input.isSponsored ?? false,
    engagementEnabled: input.engagementEnabled ?? true,
    allowComments: input.allowComments ?? true,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
    readingTime: readingTime(input.content),
  };

  let article;
  if (id) {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) return { error: "Article not found." };
    const ownsIt = existing.authorId === session.user.id;
    if (!(ownsIt ? hasPermission(role, { article: ["updateOwn"] }) : hasPermission(role, { article: ["update"] }))) {
      return { error: "You can't edit this article." };
    }

    // Version snapshot of the previous state when the content changed.
    if (
      existing.content !== data.content ||
      existing.title !== data.title ||
      existing.excerpt !== data.excerpt
    ) {
      await prisma.articleVersion.create({
        data: {
          articleId: id,
          title: existing.title,
          excerpt: existing.excerpt,
          content: existing.content,
          editorId: session.user.id,
        },
      });
      // Cap at 20 versions per article.
      const excess = await prisma.articleVersion.findMany({
        where: { articleId: id },
        orderBy: { createdAt: "desc" },
        skip: 20,
        select: { id: true },
      });
      if (excess.length) {
        await prisma.articleVersion.deleteMany({
          where: { id: { in: excess.map((v) => v.id) } },
        });
      }
    }

    const slug = input.slug ? await uniqueSlug(input.slug, id) : existing.slug;
    article = await prisma.article.update({ where: { id }, data: { ...data, slug } });
  } else {
    const slug = await uniqueSlug(input.slug || input.title);
    article = await prisma.article.create({
      data: { ...data, slug, authorId: session.user.id, status: "draft" },
    });
    await logActivity({
      userId: session.user.id,
      action: "article.created",
      targetType: "article",
      targetId: article.id,
      detail: article.title,
    });
  }

  await syncTags(article.id, input.tags);
  await syncMediaUsage(article.id, data.content, data.coverImage);
  revalidateContent();
  return { id: article.id, slug: article.slug };
}

/** Version history for the editor panel. */
export async function listVersions(articleId: string) {
  const session = await requireSession();
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) return [];
  const ownsIt = article.authorId === session.user.id;
  if (!(ownsIt || hasPermission(session.user.role, { article: ["update"] }))) return [];

  return prisma.articleVersion.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });
}

/** Returns the snapshot so the editor can load it (a save re-snapshots current state). */
export async function getVersion(versionId: string) {
  const session = await requireSession();
  const version = await prisma.articleVersion.findUnique({
    where: { id: versionId },
    include: { article: { select: { authorId: true } } },
  });
  if (!version) return null;
  const ownsIt = version.article.authorId === session.user.id;
  if (!(ownsIt || hasPermission(session.user.role, { article: ["update"] }))) return null;
  return {
    title: version.title,
    excerpt: version.excerpt,
    content: version.content,
    createdAt: version.createdAt.toISOString(),
  };
}

async function transition(
  id: string,
  updates: Record<string, unknown>,
  opts: {
    action: string;
    requireOwn?: boolean; // authors may do this on their own article
    permission?: "publish" | "update" | "delete" | "feature";
  }
) {
  const session = await requireSession();
  const role = session.user.role;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { error: "Article not found." };

  const ownsIt = article.authorId === session.user.id;
  const permitted = opts.permission
    ? hasPermission(role, { article: [opts.permission] })
    : opts.requireOwn
      ? ownsIt || hasPermission(role, { article: ["update"] })
      : false;

  if (!permitted) return { error: "You don't have permission to do that." };

  await prisma.article.update({ where: { id }, data: updates });
  if (typeof updates.status === "string" && updates.status !== article.status) {
    await prisma.articleStatusHistory
      .create({
        data: {
          articleId: id,
          fromStatus: article.status,
          toStatus: updates.status,
          userId: session.user.id,
        },
      })
      .catch(() => {});
  }
  await logActivity({
    userId: session.user.id,
    action: opts.action,
    targetType: "article",
    targetId: id,
    detail: article.title,
  });
  revalidateContent();
  revalidatePath(`/articles/${article.slug}`);
  return { success: true };
}

/** Author: send a draft (or revision) to editorial review. */
export async function submitForReview(id: string) {
  return transition(id, { status: "pending" }, { action: "article.submitted", requireOwn: true });
}

/** Editor+: send back to the author for changes. */
export async function requestChanges(id: string) {
  return transition(
    id,
    { status: "needs_revision" },
    { action: "article.changes_requested", permission: "publish" }
  );
}

/** Editor+: advance a pending article to fact checking. */
export async function moveToFactCheck(id: string) {
  return transition(id, { status: "fact_check" }, { action: "article.fact_check", permission: "publish" });
}

/** Editor+: fact check passed — on to SEO review. */
export async function moveToSeoReview(id: string) {
  return transition(id, { status: "seo_review" }, { action: "article.seo_review", permission: "publish" });
}

/** Editor+: fully approved and ready to publish or schedule. */
export async function approveArticle(id: string) {
  return transition(id, { status: "approved" }, { action: "article.approved", permission: "publish" });
}

export async function publishArticle(id: string) {
  const result = await transition(
    id,
    { status: "published", publishedAt: new Date(), scheduledFor: null },
    { action: "article.published", permission: "publish" }
  );
  if ("success" in result && result.success) {
    fanOutPublished(id).catch((err) => console.error("publish fan-out failed:", err));
  }
  return result;
}

/** Notify followers (author + category) and, for breaking news, opted-in readers. */
async function fanOutPublished(id: string) {
  const { notify, followerIdsOf } = await import("@/lib/notify");
  const { checkAchievements } = await import("@/lib/achievements");

  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, username: true } },
      category: { select: { slug: true, name: true } },
    },
  });
  if (!article) return;

  checkAchievements(article.authorId, "publish").catch(() => {});

  const [authorFollowers, categoryFollowers] = await Promise.all([
    followerIdsOf("author", article.author.username ?? article.authorId),
    article.category ? followerIdsOf("category", article.category.slug) : Promise.resolve([]),
  ]);
  const followers = [...new Set([...authorFollowers, ...categoryFollowers])].filter(
    (uid) => uid !== article.authorId
  );

  if (followers.length) {
    await notify({
      userIds: followers,
      type: "new_article",
      title: `New from ${article.author.name}: ${article.title}`,
      body: article.excerpt.slice(0, 140),
      url: `/articles/${article.slug}`,
      priority: "medium",
    });
  }

  if (article.isBreaking) {
    const optedIn = await prisma.notificationPreferences.findMany({
      where: { breakingNews: true },
      select: { userId: true },
    });
    if (optedIn.length) {
      await notify({
        userIds: optedIn.map((o) => o.userId),
        type: "breaking",
        title: `🔴 Breaking: ${article.title}`,
        body: article.excerpt.slice(0, 140),
        url: `/articles/${article.slug}`,
        priority: "high",
        email: true,
      });
    }
  }
}

export async function scheduleArticle(id: string, when: string) {
  const date = new Date(when);
  if (Number.isNaN(date.getTime()) || date <= new Date()) {
    return { error: "Pick a future date and time." };
  }
  return transition(
    id,
    { status: "scheduled", scheduledFor: date, publishedAt: date },
    { action: "article.scheduled", permission: "publish" }
  );
}

export async function unpublishArticle(id: string) {
  return transition(id, { status: "draft" }, { action: "article.unpublished", permission: "publish" });
}

export async function archiveArticle(id: string) {
  return transition(id, { status: "archived" }, { action: "article.archived", permission: "publish" });
}

export async function trashArticle(id: string) {
  return transition(id, { status: "trashed" }, { action: "article.trashed", permission: "delete" });
}

export async function restoreArticle(id: string) {
  return transition(id, { status: "draft" }, { action: "article.restored", permission: "delete" });
}

export async function deleteArticleForever(id: string) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, { article: ["delete"] })) {
    return { error: "You don't have permission to do that." };
  }
  const article = await prisma.article.delete({ where: { id } });
  await logActivity({
    userId: session.user.id,
    action: "article.deleted",
    targetType: "article",
    detail: article.title,
  });
  revalidateContent();
  return { success: true };
}

export async function toggleFeatured(id: string) {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { error: "Article not found." };
  return transition(
    id,
    { featured: !article.featured },
    { action: article.featured ? "article.unfeatured" : "article.featured", permission: "feature" }
  );
}

export async function togglePinned(id: string) {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { error: "Article not found." };
  return transition(
    id,
    { pinned: !article.pinned },
    { action: article.pinned ? "article.unpinned" : "article.pinned", permission: "feature" }
  );
}

export async function duplicateArticle(id: string) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, { article: ["create"] })) {
    return { error: "You don't have permission to do that." };
  }
  const source = await prisma.article.findUnique({
    where: { id },
    include: { tags: true },
  });
  if (!source) return { error: "Article not found." };

  const copy = await prisma.article.create({
    data: {
      title: `${source.title} (copy)`,
      slug: await uniqueSlug(`${source.slug}-copy`),
      excerpt: source.excerpt,
      content: source.content,
      coverImage: source.coverImage,
      categoryId: source.categoryId,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      readingTime: source.readingTime,
      status: "draft",
      authorId: session.user.id,
      tags: { create: source.tags.map((t) => ({ tagId: t.tagId })) },
    },
  });
  await logActivity({
    userId: session.user.id,
    action: "article.duplicated",
    targetType: "article",
    targetId: copy.id,
    detail: source.title,
  });
  revalidateContent();
  return { id: copy.id };
}
