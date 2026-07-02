"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { readingTime, slugify } from "@/lib/utils";

// ----------------------------------------------------------------
// Content approval workflow:
//   author:  draft → pending (submit for review)
//   editor+: pending → published / back to draft (request changes)
//   editor+: publish now, schedule, archive, feature, pin
//   admin/superadmin: everything, including trash/restore/hard delete
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

  const data = {
    title: input.title.trim() || "Untitled",
    excerpt: input.excerpt.trim(),
    content: input.content,
    coverImage: input.coverImage?.trim() || null,
    categoryId: input.categoryId || null,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    canonicalUrl: input.canonicalUrl?.trim() || null,
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
  revalidateContent();
  return { id: article.id, slug: article.slug };
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

/** Author: send a draft to editorial review. */
export async function submitForReview(id: string) {
  return transition(id, { status: "pending" }, { action: "article.submitted", requireOwn: true });
}

/** Editor+: send back to the author for changes. */
export async function requestChanges(id: string) {
  return transition(id, { status: "draft" }, { action: "article.changes_requested", permission: "publish" });
}

export async function publishArticle(id: string) {
  return transition(
    id,
    { status: "published", publishedAt: new Date(), scheduledFor: null },
    { action: "article.published", permission: "publish" }
  );
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
