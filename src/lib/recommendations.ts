import { prisma } from "@/lib/prisma";
import { articleInclude, liveWhere, type ArticleWithRelations } from "@/lib/articles";

/**
 * Multi-signal recommendation engine.
 *
 * Signals and weights:
 *   +3.0  category matches a chosen interest
 *   +2.5  author the user follows
 *   +2.0  tag the user follows
 *   +1.5  category the user follows
 *   +1.5  category the user has recently read in
 *   +1.0  editorially featured
 *   +0.0–1.0  recency (linear decay over 14 days)
 *   +log10(views+1) * 0.4  global popularity
 *
 * Already-read articles are excluded. Falls back to popular content for
 * brand-new users with no signals yet.
 */
export async function getRecommendations(
  userId: string,
  take = 6
): Promise<ArticleWithRelations[]> {
  const [interests, follows, history, candidates] = await Promise.all([
    prisma.userInterest.findMany({ where: { userId } }),
    prisma.follow.findMany({ where: { userId } }),
    prisma.readingHistory.findMany({
      where: { userId },
      orderBy: { readAt: "desc" },
      take: 50,
    }),
    prisma.article.findMany({
      where: liveWhere(),
      include: articleInclude,
      orderBy: { publishedAt: "desc" },
      take: 150,
    }),
  ]);

  const interestSlugs = new Set(interests.map((i) => i.topic));
  const followedAuthors = new Set(
    follows.filter((f) => f.targetType === "author").map((f) => f.targetKey)
  );
  const followedCategories = new Set(
    follows.filter((f) => f.targetType === "category").map((f) => f.targetKey)
  );
  const followedTags = new Set(
    follows.filter((f) => f.targetType === "tag").map((f) => f.targetKey)
  );
  const readSlugs = new Set(history.map((h) => h.articleSlug));

  // Categories the user actually reads (implicit interest).
  const readCategorySlugs = new Set<string>();
  if (history.length > 0) {
    const readArticles = await prisma.article.findMany({
      where: { slug: { in: [...readSlugs] } },
      select: { category: { select: { slug: true } } },
    });
    for (const a of readArticles) {
      if (a.category) readCategorySlugs.add(a.category.slug);
    }
  }

  const now = Date.now();
  const scored = candidates
    .filter((a) => !readSlugs.has(a.slug))
    .map((article) => {
      let score = 0;
      const catSlug = article.category?.slug;
      if (catSlug) {
        if (interestSlugs.has(catSlug)) score += 3;
        if (followedCategories.has(catSlug)) score += 1.5;
        if (readCategorySlugs.has(catSlug)) score += 1.5;
      }
      const authorKey = article.author.username ?? article.authorId;
      if (followedAuthors.has(authorKey)) score += 2.5;
      if (article.tags.some((t) => followedTags.has(t.tag.slug))) score += 2;
      if (article.featured) score += 1;

      const ageDays =
        (now - (article.publishedAt ?? article.createdAt).getTime()) / 86_400_000;
      score += Math.max(0, 1 - ageDays / 14);
      score += Math.log10(article.views + 1) * 0.4;

      return { article, score };
    })
    .sort((a, b) => b.score - a.score);

  const personalized = scored.filter((s) => s.score >= 2);
  const pool = personalized.length >= take ? personalized : scored;
  return pool.slice(0, take).map((s) => s.article);
}

/** Authors the user doesn't follow yet, ranked by followers + output. */
export async function getSuggestedAuthors(userId: string | null, take = 4) {
  const followedKeys = userId
    ? new Set(
        (
          await prisma.follow.findMany({
            where: { userId, targetType: "author" },
            select: { targetKey: true },
          })
        ).map((f) => f.targetKey)
      )
    : new Set<string>();

  const authors = await prisma.user.findMany({
    where: {
      role: { in: ["author", "editor", "admin", "superadmin"] },
      articles: { some: { status: "published" } },
      ...(userId ? { id: { not: userId } } : {}),
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      _count: { select: { articles: { where: { status: "published" } } } },
    },
    take: 20,
  });

  const withFollowers = await Promise.all(
    authors
      .filter((a) => !followedKeys.has(a.username ?? a.id))
      .map(async (a) => ({
        ...a,
        followers: await prisma.follow.count({
          where: { targetType: "author", targetKey: a.username ?? a.id },
        }),
      }))
  );

  return withFollowers
    .sort((a, b) => b.followers - a.followers || b._count.articles - a._count.articles)
    .slice(0, take);
}
