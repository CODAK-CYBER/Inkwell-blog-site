import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/articles";

export interface Insight {
  emoji: string;
  text: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Heuristic "AI insight" engine: rule-based analysis over real platform
 * data. Each rule guards against small samples; with little data it
 * returns starter guidance instead of noise.
 */
export async function generateInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 86_400_000);
  const twoWeeksAgo = new Date(now - 14 * 86_400_000);

  const [articles, viewsThisWeek, viewsLastWeek, history, zeroResultSearches] = await Promise.all([
    prisma.article.findMany({
      where: liveWhere(),
      select: {
        id: true,
        views: true,
        publishedAt: true,
        readingTime: true,
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.viewEvent.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { articleId: true },
    }),
    prisma.viewEvent.findMany({
      where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
      select: { articleId: true },
    }),
    prisma.readingHistory.findMany({
      select: { userId: true, articleSlug: true, progress: true },
    }),
    prisma.searchHistory.groupBy({
      by: ["query"],
      where: { results: 0 },
      _count: true,
      orderBy: { _count: { query: "desc" } },
      take: 3,
    }),
  ]);

  // 1. Best publishing weekday (needs ≥5 articles)
  if (articles.length >= 5) {
    const byDay = new Map<number, { views: number; count: number }>();
    for (const a of articles) {
      if (!a.publishedAt) continue;
      const day = a.publishedAt.getDay();
      const entry = byDay.get(day) ?? { views: 0, count: 0 };
      entry.views += a.views;
      entry.count += 1;
      byDay.set(day, entry);
    }
    const ranked = [...byDay.entries()]
      .filter(([, v]) => v.count >= 1)
      .map(([day, v]) => ({ day, avg: v.views / v.count }))
      .sort((a, b) => b.avg - a.avg);
    if (ranked.length >= 2 && ranked[0].avg > ranked[ranked.length - 1].avg * 1.3) {
      insights.push({
        emoji: "📅",
        text: `Articles published on ${WEEKDAYS[ranked[0].day]}s average ${Math.round(ranked[0].avg)} views — your strongest publishing day so far.`,
      });
    }
  }

  // 2. Category momentum: this week vs last week
  const articleById = new Map(articles.map((a) => [a.id, a]));
  const countByCategory = (events: Array<{ articleId: string }>) => {
    const map = new Map<string, number>();
    for (const e of events) {
      const cat = articleById.get(e.articleId)?.category?.name;
      if (cat) map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return map;
  };
  const thisWeek = countByCategory(viewsThisWeek);
  const lastWeek = countByCategory(viewsLastWeek);
  for (const [category, current] of thisWeek) {
    const prev = lastWeek.get(category) ?? 0;
    if (prev >= 5 && current >= prev * 1.5) {
      insights.push({
        emoji: "📈",
        text: `${category} is heating up — views grew ${Math.round(((current - prev) / prev) * 100)}% week-over-week.`,
      });
    } else if (prev >= 5 && current <= prev * 0.5) {
      insights.push({
        emoji: "📉",
        text: `${category} engagement is declining (${prev} → ${current} weekly views). Consider fresh content or a collection refresh.`,
      });
    }
  }

  // 3. Cross-category affinity ("readers of X also read Y")
  if (history.length >= 10) {
    const slugToCategory = new Map(
      (
        await prisma.article.findMany({
          where: { slug: { in: [...new Set(history.map((h) => h.articleSlug))] } },
          select: { slug: true, category: { select: { name: true } } },
        })
      ).map((a) => [a.slug, a.category?.name])
    );
    const byUser = new Map<string, Set<string>>();
    for (const h of history) {
      const cat = slugToCategory.get(h.articleSlug);
      if (!cat) continue;
      if (!byUser.has(h.userId)) byUser.set(h.userId, new Set());
      byUser.get(h.userId)!.add(cat);
    }
    const pairCounts = new Map<string, number>();
    for (const cats of byUser.values()) {
      const list = [...cats].sort();
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const key = `${list[i]}|${list[j]}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }
    const top = [...pairCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) {
      const [a, b] = top[0].split("|");
      insights.push({
        emoji: "🔗",
        text: `Readers of ${a} frequently also read ${b} (${top[1]} readers overlap) — cross-link these categories or build a joint collection.`,
      });
    }
  }

  // 4. Completion vs length
  const withProgress = history.filter((h) => h.progress > 0);
  if (withProgress.length >= 10) {
    const slugToTime = new Map(articles.map((a) => [a.id, a.readingTime]));
    void slugToTime;
    const avgCompletion =
      withProgress.reduce((s, h) => s + h.progress, 0) / withProgress.length;
    insights.push({
      emoji: "📖",
      text: `Average read depth is ${Math.round(avgCompletion * 100)}% across ${withProgress.length} tracked reads${avgCompletion < 0.5 ? " — consider tighter intros and more subheadings" : " — readers are staying engaged"}.`,
    });
  }

  // 5. Zero-result searches = content demand
  for (const search of zeroResultSearches) {
    insights.push({
      emoji: "🔍",
      text: `Readers searched “${search.query}” ${search._count} time(s) and found nothing — a content gap worth filling.`,
    });
  }

  if (insights.length === 0) {
    insights.push(
      { emoji: "🌱", text: "Not enough data for pattern detection yet. Insights sharpen as views, reads and searches accumulate." },
      { emoji: "💡", text: "Early best practice: publish consistently in your readers' top interest categories and watch the weekly momentum panel." }
    );
  }

  return insights.slice(0, 6);
}

/** Simple linear projection of weekly view counts, 4 weeks ahead. */
export async function forecastWeeklyViews() {
  const weeks = 6;
  const now = Date.now();
  const series: Array<{ label: string; count: number }> = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now - (i + 1) * 7 * 86_400_000);
    const end = new Date(now - i * 7 * 86_400_000);
    const count = await prisma.viewEvent.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    series.push({ label: `W-${i}`, count });
  }

  // Least-squares fit over observed weeks
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((s) => s.count);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const slope =
    xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0) /
    Math.max(1, xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0));
  const intercept = yMean - slope * xMean;

  const projection = Array.from({ length: 4 }, (_, i) => ({
    label: `W+${i + 1}`,
    count: Math.max(0, Math.round(intercept + slope * (n + i))),
  }));

  return { observed: series, projection, trend: slope >= 0 ? "growing" : "declining" as const };
}
