import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Article as ArticleCardModel } from "@/types";

/**
 * "Live" articles: published, or scheduled articles whose time has come.
 * (A cron flips scheduled → published in production; this filter keeps
 * dev correct without one.)
 */
export function liveWhere(): Prisma.ArticleWhereInput {
  const now = new Date();
  return {
    AND: [
      {
        OR: [
          { status: "published" },
          { status: "scheduled", scheduledFor: { lte: now } },
        ],
      },
      // Scheduled expiration: articles past expiresAt drop off the site.
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ],
  };
}

export const articleInclude = {
  author: { select: { name: true, username: true, image: true } },
  category: { select: { name: true, slug: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.ArticleInclude;

export type ArticleWithRelations = Prisma.ArticleGetPayload<{
  include: typeof articleInclude;
}>;

/** Map a DB row to the card view-model used across the site. */
export function toCardModel(a: ArticleWithRelations): ArticleCardModel {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImage ?? undefined,
    category: a.category
      ? { id: a.category.slug, name: a.category.name, slug: a.category.slug }
      : { id: "general", name: "General", slug: "general" },
    author: {
      id: a.author.username ?? "",
      name: a.author.name,
      slug: a.author.username ?? "",
    },
    tags: a.tags.map((t) => t.tag.name),
    publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
    readingTimeMinutes: a.readingTime,
    featured: a.featured,
  };
}

export async function getLiveArticles(opts?: {
  take?: number;
  categorySlug?: string;
  featured?: boolean;
}) {
  const rows = await prisma.article.findMany({
    where: {
      ...liveWhere(),
      ...(opts?.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
      ...(opts?.featured !== undefined ? { featured: opts.featured } : {}),
    },
    include: articleInclude,
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: opts?.take,
  });
  return rows;
}
