import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ArticlesTable, type ArticleRow } from "@/components/admin/articles-table";

export const metadata: Metadata = {
  title: "Articles — admin",
  robots: { index: false },
};

const STATUSES = [
  "all",
  "published",
  "pending",
  "needs_revision",
  "fact_check",
  "seo_review",
  "approved",
  "draft",
  "scheduled",
  "archived",
  "trashed",
] as const;

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function AdminArticlesPage({ searchParams }: Props) {
  const { status = "all", q } = await searchParams;
  const query = q?.trim() ?? "";

  const [articles, counts] = await Promise.all([
    prisma.article.findMany({
      where: {
        ...(status !== "all" ? { status } : {}),
        ...(query
          ? { OR: [{ title: { contains: query } }, { author: { name: { contains: query } } }] }
          : {}),
      },
      include: {
        author: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.article.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (s: string) =>
    s === "all"
      ? counts.reduce((sum, c) => sum + c._count, 0)
      : (counts.find((c) => c.status === s)?._count ?? 0);

  const rows: ArticleRow[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    status: a.status,
    featured: a.featured,
    pinned: a.pinned,
    views: a.views,
    author: a.author.name,
    category: a.category?.name ?? "—",
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Articles</h1>
        <Link href="/write" className={buttonVariants({ variant: "accent", size: "sm" })}>
          New article
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mt-4 flex flex-wrap gap-1 border-b">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/articles?status=${s}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
              status === s
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {s.replace(/_/g, " ")}{" "}
            <span className="text-xs text-muted-foreground">({countFor(s)})</span>
          </Link>
        ))}
      </div>

      {/* Search */}
      <form action="/admin/articles" method="GET" className="mt-4 flex max-w-sm gap-2">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={query}
          placeholder="Search title or author…"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Search
        </button>
      </form>

      <ArticlesTable rows={rows} />
    </div>
  );
}
