import type { Metadata } from "next";
import Link from "next/link";
import {
  Eye,
  FileText,
  FolderTree,
  Heart,
  PenSquare,
  Users as UsersIcon,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/articles";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false },
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  "article.created": "created article",
  "article.submitted": "submitted for review",
  "article.changes_requested": "requested changes on",
  "article.published": "published",
  "article.scheduled": "scheduled",
  "article.unpublished": "unpublished",
  "article.archived": "archived",
  "article.trashed": "trashed",
  "article.restored": "restored",
  "article.deleted": "deleted",
  "article.featured": "featured",
  "article.unfeatured": "unfeatured",
  "article.pinned": "pinned",
  "article.unpinned": "unpinned",
  "article.duplicated": "duplicated",
  "user.became_author": "became an author",
  "category.created": "created category",
  "category.updated": "updated category",
  "category.deleted": "deleted category",
  "tag.created": "created tag",
  "tag.deleted": "deleted tag",
  "tag.merged": "merged tag",
};

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    activeUsers,
    newUsersToday,
    articlesByStatus,
    totalViews,
    totalLikes,
    totalBookmarks,
    topCategories,
    mostViewed,
    pendingReview,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.session.groupBy({ by: ["userId"], where: { expiresAt: { gt: now } } }).then((g) => g.length),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.article.groupBy({ by: ["status"], _count: true }),
    prisma.article.aggregate({ _sum: { views: true } }),
    prisma.like.count(),
    prisma.bookmark.count(),
    prisma.category.findMany({
      include: { _count: { select: { articles: { where: liveWhere() } } } },
      orderBy: { articles: { _count: "desc" } },
      take: 5,
    }),
    prisma.article.findMany({
      where: liveWhere(),
      orderBy: { views: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, views: true },
    }),
    prisma.article.findMany({
      where: { status: "pending" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, author: { select: { name: true } } },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const statusCount = (s: string) =>
    articlesByStatus.find((r) => r.status === s)?._count ?? 0;
  const totalArticles = articlesByStatus.reduce((sum, r) => sum + r._count, 0);

  return (
    <div className="space-y-8">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/write" className={buttonVariants({ variant: "accent", size: "sm" })}>
          <PenSquare className="size-4" />
          New article
        </Link>
        <Link href="/admin/articles?status=pending" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Review queue ({statusCount("pending")})
        </Link>
        <Link href="/admin/users" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <UsersIcon className="size-4" />
          Manage users
        </Link>
        <Link href="/admin/categories" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <FolderTree className="size-4" />
          Categories
        </Link>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          View site →
        </Link>
      </div>

      {/* Stats */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Platform
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Total users" value={totalUsers} sub={`${newUsersToday} new today`} />
          <StatCard label="Active users" value={activeUsers} sub="with a live session" />
          <StatCard label="Total articles" value={totalArticles} />
          <StatCard label="Total views" value={(totalViews._sum.views ?? 0).toLocaleString()} />
          <StatCard label="Published" value={statusCount("published")} />
          <StatCard label="Drafts" value={statusCount("draft")} />
          <StatCard label="Pending review" value={statusCount("pending")} />
          <StatCard label="Scheduled" value={statusCount("scheduled")} />
          <StatCard label="Likes" value={totalLikes} />
          <StatCard label="Bookmarks" value={totalBookmarks} />
          <StatCard label="Comments" value="—" sub="arrives in Phase 7" />
          <StatCard label="Revenue" value="—" sub="arrives in Phase 10" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Review queue */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <FileText className="size-4 text-accent" />
            Awaiting review
          </h2>
          {pendingReview.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing in the review queue. 🎉</p>
          ) : (
            <ul className="mt-3 divide-y">
              {pendingReview.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/write/${a.id}`} className="truncate text-sm font-medium hover:text-accent">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">by {a.author.name}</p>
                  </div>
                  <Link href={`/write/${a.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Most viewed */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <Eye className="size-4 text-accent" />
            Most viewed articles
          </h2>
          <ul className="mt-3 divide-y">
            {mostViewed.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className="w-5 text-center font-serif text-sm font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <Link
                  href={`/articles/${a.slug}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent"
                >
                  {a.title}
                </Link>
                <span className="text-xs text-muted-foreground">{a.views.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Top categories */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <FolderTree className="size-4 text-accent" />
            Top categories
          </h2>
          <ul className="mt-3 space-y-2">
            {topCategories.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span>
                  {c.icon} {c.name}
                </span>
                <Badge variant="secondary">{c._count.articles}</Badge>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent activity */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <Heart className="size-4 text-accent" />
            Recent activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {recentActivity.map((log) => (
                <li key={log.id} className="text-sm">
                  <span className="font-medium">{log.user?.name ?? "System"}</span>{" "}
                  <span className="text-muted-foreground">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>{" "}
                  {log.detail && <span className="font-medium">“{log.detail}”</span>}
                  <span className="block text-xs text-muted-foreground">
                    {log.createdAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <Wallet className="size-4" />
        Newsletter, ads, analytics, revenue, memberships, security center, backups, AI tools and
        feature flags unlock in Phases 8–13 — their places are reserved in the sidebar.
      </p>
    </div>
  );
}
