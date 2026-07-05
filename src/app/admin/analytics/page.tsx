import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, Bot, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { liveWhere } from "@/lib/articles";
import { generateInsights, forecastWeeklyViews } from "@/lib/insights";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Analytics — admin",
  robots: { index: false },
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BarList({ items }: { items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate text-muted-foreground">{item.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded bg-secondary">
            <div className="h-full rounded bg-accent/80" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{item.count}</span>
        </li>
      ))}
      {items.length === 0 && <li className="text-sm text-muted-foreground">No data yet.</li>}
    </ul>
  );
}

function parseDevice(ua: string | null) {
  if (!ua) return "Unknown";
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

function parseBrowser(ua: string | null) {
  if (!ua) return "Unknown";
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function topN(map: Map<string, number>, n = 6) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

export default async function AdminAnalyticsPage() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) redirect("/admin");

  const now = Date.now();
  const dayAgo = new Date(now - 86_400_000);
  const monthAgo = new Date(now - 30 * 86_400_000);
  const weekAgo = new Date(now - 7 * 86_400_000);

  const [
    events30d,
    dauEvents,
    totalComments,
    totalReactions,
    topArticles,
    authors,
    popularSearches,
    zeroSearches,
    history,
    insights,
    forecast,
    userWeeks,
  ] = await Promise.all([
    prisma.viewEvent.findMany({
      where: { createdAt: { gte: monthAgo } },
      select: { userId: true, userAgent: true, referrer: true, language: true, createdAt: true },
    }),
    prisma.viewEvent.findMany({
      where: { createdAt: { gte: dayAgo }, userId: { not: null } },
      select: { userId: true },
    }),
    prisma.comment.count(),
    prisma.like.count(),
    prisma.article.findMany({
      where: liveWhere(),
      orderBy: { views: "desc" },
      take: 8,
      select: { id: true, title: true, views: true, category: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { articles: { some: { status: "published" } } },
      select: {
        id: true,
        name: true,
        articles: { where: { status: "published" }, select: { views: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.searchHistory.groupBy({
      by: ["query"],
      _count: true,
      orderBy: { _count: { query: "desc" } },
      take: 6,
    }),
    prisma.searchHistory.groupBy({
      by: ["query"],
      where: { results: 0 },
      _count: true,
      orderBy: { _count: { query: "desc" } },
      take: 6,
    }),
    prisma.readingHistory.findMany({ select: { userId: true, progress: true, readAt: true } }),
    generateInsights(),
    forecastWeeklyViews(),
    prisma.user.findMany({ select: { createdAt: true } }),
  ]);

  // Executive metrics
  const dau = new Set(dauEvents.map((e) => e.userId)).size;
  const mauSet = new Set(events30d.filter((e) => e.userId).map((e) => e.userId));
  const mau = mauSet.size;
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const daysByUser = new Map<string, Set<string>>();
  for (const h of history) {
    if (h.readAt < monthAgo) continue;
    if (!daysByUser.has(h.userId)) daysByUser.set(h.userId, new Set());
    daysByUser.get(h.userId)!.add(dayKey(h.readAt));
  }
  const returning = [...daysByUser.values()].filter((days) => days.size >= 2).length;
  const retention = daysByUser.size > 0 ? Math.round((returning / daysByUser.size) * 100) : 0;

  // Audience breakdowns
  const devices = new Map<string, number>();
  const browsers = new Map<string, number>();
  const languages = new Map<string, number>();
  const referrers = new Map<string, number>();
  for (const e of events30d) {
    devices.set(parseDevice(e.userAgent), (devices.get(parseDevice(e.userAgent)) ?? 0) + 1);
    browsers.set(parseBrowser(e.userAgent), (browsers.get(parseBrowser(e.userAgent)) ?? 0) + 1);
    if (e.language) languages.set(e.language, (languages.get(e.language) ?? 0) + 1);
    if (e.referrer) {
      try {
        const host = new URL(e.referrer).hostname;
        if (!host.includes("localhost")) referrers.set(host, (referrers.get(host) ?? 0) + 1);
      } catch {
        // ignore malformed referrers
      }
    }
  }

  // User growth: last 6 weeks
  const growth: Array<{ label: string; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now - (i + 1) * 7 * 86_400_000);
    const end = new Date(now - i * 7 * 86_400_000);
    growth.push({
      label: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: userWeeks.filter((u) => u.createdAt >= start && u.createdAt < end).length,
    });
  }

  const authorRows = authors
    .map((a) => ({
      name: a.name,
      articles: a.articles.length,
      views: a.articles.reduce((s, x) => s + x.views, 0),
      comments: a._count.comments,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const avgCompletion = history.length
    ? Math.round((history.reduce((s, h) => s + h.progress, 0) / history.length) * 100)
    : 0;

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <BarChart3 className="size-5 text-accent" />
        Analytics & intelligence
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Last 30 days unless noted. Country-level analytics need a geo-IP service (Phase 13+).
      </p>

      {/* Executive */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="DAU (signed-in)" value={dau} />
        <Stat label="MAU (signed-in)" value={mau} />
        <Stat label="Reader retention" value={`${retention}%`} sub="read on 2+ days (30d)" />
        <Stat label="Avg read depth" value={`${avgCompletion}%`} sub={`${history.length} tracked reads`} />
        <Stat label="Engagement" value={totalComments + totalReactions} sub={`${totalComments} comments · ${totalReactions} reactions`} />
      </div>

      {/* AI insights */}
      <section className="mt-6 rounded-xl border border-accent/40 bg-accent-soft/30 p-5">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Bot className="size-4 text-accent" />
          AI insights
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Heuristic pattern analysis over your real data — refreshed on every load.
        </p>
        <ul className="mt-3 space-y-2">
          {insights.map((insight) => (
            <li key={insight.text} className="flex items-start gap-2 text-sm">
              <span>{insight.emoji}</span>
              <span>{insight.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Forecast */}
      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <TrendingUp className="size-4 text-accent" />
          Traffic forecast
          <Badge variant={forecast.trend === "growing" ? "accent" : "outline"}>{forecast.trend}</Badge>
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Weekly views: 6 observed + 4 projected (linear fit).
        </p>
        <div className="mt-4 flex h-32 items-end gap-1.5">
          {[...forecast.observed, ...forecast.projection].map((week, i) => {
            const max = Math.max(1, ...forecast.observed.map((w) => w.count), ...forecast.projection.map((w) => w.count));
            const projected = i >= forecast.observed.length;
            return (
              <div key={week.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{week.count}</span>
                <div
                  className={projected ? "w-full rounded-t border-2 border-dashed border-accent/60 bg-accent/20" : "w-full rounded-t bg-accent/80"}
                  style={{ height: `${Math.max(3, (week.count / max) * 100)}%` }}
                  title={`${week.label}: ${week.count}${projected ? " (projected)" : ""}`}
                />
                <span className="text-[9px] text-muted-foreground">{week.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Audience */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Audience — devices</h2>
          <BarList items={topN(devices)} />
          <h2 className="mt-5 font-serif text-lg font-semibold">Browsers</h2>
          <BarList items={topN(browsers)} />
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Languages</h2>
          <BarList items={topN(languages)} />
          <h2 className="mt-5 font-serif text-lg font-semibold">Referring sites</h2>
          <BarList items={topN(referrers)} />
        </section>

        {/* Content */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Top content (all time)</h2>
          <ul className="mt-3 divide-y">
            {topArticles.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-5 text-center font-serif font-bold text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{a.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.category?.name} · {a.views.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Authors */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Author performance</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1 font-medium">Author</th>
                <th className="py-1 text-right font-medium">Articles</th>
                <th className="py-1 text-right font-medium">Views</th>
                <th className="py-1 text-right font-medium">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {authorRows.map((a) => (
                <tr key={a.name}>
                  <td className="py-1.5">{a.name}</td>
                  <td className="py-1.5 text-right">{a.articles}</td>
                  <td className="py-1.5 text-right">{a.views.toLocaleString()}</td>
                  <td className="py-1.5 text-right">{a.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Search intelligence */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Popular searches</h2>
          <BarList items={popularSearches.map((s) => ({ label: s.query, count: s._count }))} />
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Zero-result searches</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Content demand you haven&apos;t met yet.</p>
          <BarList items={zeroSearches.map((s) => ({ label: s.query, count: s._count }))} />
        </section>

        {/* Growth */}
        <section className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="font-serif text-lg font-semibold">User growth — new registrations per week</h2>
          <BarList items={growth} />
        </section>
      </div>
    </div>
  );
}
