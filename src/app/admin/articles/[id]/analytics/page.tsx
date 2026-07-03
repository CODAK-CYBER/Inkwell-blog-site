import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Article analytics — admin",
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

export default async function ArticleAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true, views: true, status: true, publishedAt: true },
  });
  if (!article) notFound();

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [events, likes, bookmarks, history] = await Promise.all([
    prisma.viewEvent.findMany({
      where: { articleId: id },
      select: { userId: true, createdAt: true },
    }),
    prisma.like.count({ where: { articleSlug: article.slug } }),
    prisma.bookmark.count({ where: { articleSlug: article.slug } }),
    prisma.readingHistory.findMany({
      where: { articleSlug: article.slug },
      select: { progress: true },
    }),
  ]);

  const uniqueReaders = new Set(events.filter((e) => e.userId).map((e) => e.userId)).size;
  const anonymous = events.filter((e) => !e.userId).length;
  const avgProgress = history.length
    ? history.reduce((s, h) => s + h.progress, 0) / history.length
    : 0;
  const completions = history.filter((h) => h.progress >= 0.9).length;

  // Views per day, last 14 days
  const days: Array<{ label: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    days.push({
      label: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: events.filter((e) => e.createdAt >= dayStart && e.createdAt < dayEnd).length,
    });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const recentViews = events.filter((e) => e.createdAt >= since).length;

  return (
    <div>
      <Link href="/admin/articles" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to articles
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BarChart3 className="size-5 text-accent" />
          {article.title}
        </h1>
        <Badge variant="secondary" className="capitalize">{article.status}</Badge>
        <Link href={`/articles/${article.slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          View article
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Total views" value={article.views.toLocaleString()} />
        <Stat label="Last 14 days" value={recentViews} />
        <Stat label="Unique readers" value={uniqueReaders} sub={`+ ${anonymous} anonymous views`} />
        <Stat label="Avg. read depth" value={`${Math.round(avgProgress * 100)}%`} sub={`${history.length} tracked readers`} />
        <Stat label="Completion rate" value={history.length ? `${Math.round((completions / history.length) * 100)}%` : "—"} sub={`${completions} finished`} />
        <Stat label="Engagement" value={likes + bookmarks} sub={`${likes} likes · ${bookmarks} saves`} />
      </div>

      {/* Views per day */}
      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold">Views — last 14 days</h2>
        <div className="mt-4 flex h-40 items-end gap-1.5">
          {days.map((d) => (
            <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {d.count}
              </span>
              <div
                className="w-full rounded-t bg-accent/80 transition-colors group-hover:bg-accent"
                style={{ height: `${Math.max(2, (d.count / maxDay) * 100)}%` }}
                title={`${d.label}: ${d.count} views`}
              />
              <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        Traffic sources, devices and countries arrive with the full analytics suite in Phase 11.
      </p>
    </div>
  );
}
