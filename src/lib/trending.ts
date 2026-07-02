import { prisma } from "@/lib/prisma";
import { articleInclude, liveWhere, type ArticleWithRelations } from "@/lib/articles";

export type TrendingWindow = "day" | "week" | "month";

const WINDOW_MS: Record<TrendingWindow, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

// Engagement weights: a save is worth more than a like, a like more than a view.
const WEIGHT = { view: 1, like: 4, save: 6 };

export interface TrendingArticle {
  article: ArticleWithRelations;
  score: number;
  windowViews: number;
}

/**
 * Trending = recent engagement (views, likes, saves) inside the time window,
 * computed live from event tables. Falls back to all-time views when a window
 * has no activity yet (young platforms shouldn't show an empty trending page).
 */
export async function getTrendingArticles(opts?: {
  window?: TrendingWindow;
  categorySlug?: string;
  take?: number;
}): Promise<TrendingArticle[]> {
  const window = opts?.window ?? "week";
  const take = opts?.take ?? 10;
  const since = new Date(Date.now() - WINDOW_MS[window]);

  const [candidates, views, likes, saves] = await Promise.all([
    prisma.article.findMany({
      where: {
        ...liveWhere(),
        ...(opts?.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
      },
      include: articleInclude,
      orderBy: { publishedAt: "desc" },
      take: 200,
    }),
    prisma.viewEvent.groupBy({
      by: ["articleId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.like.groupBy({
      by: ["articleSlug"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.bookmark.groupBy({
      by: ["articleSlug"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const viewsById = new Map(views.map((v) => [v.articleId, v._count._all]));
  const likesBySlug = new Map(likes.map((l) => [l.articleSlug, l._count._all]));
  const savesBySlug = new Map(saves.map((s) => [s.articleSlug, s._count._all]));

  const scored = candidates.map((article) => {
    const windowViews = viewsById.get(article.id) ?? 0;
    const score =
      windowViews * WEIGHT.view +
      (likesBySlug.get(article.slug) ?? 0) * WEIGHT.like +
      (savesBySlug.get(article.slug) ?? 0) * WEIGHT.save;
    return { article, score, windowViews };
  });

  const active = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  if (active.length >= Math.min(3, take)) return active.slice(0, take);

  // Fallback: all-time views so the section is never empty.
  return scored
    .sort((a, b) => b.article.views - a.article.views)
    .slice(0, take)
    .map((s) => ({ ...s, score: s.article.views }));
}

/** Top search queries in the last 7 days. */
export async function getTrendingSearches(take = 6) {
  const since = new Date(Date.now() - WINDOW_MS.week);
  const rows = await prisma.searchHistory.groupBy({
    by: ["query"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { query: "desc" } },
    take,
  });
  return rows.map((r) => r.query);
}
