import type { Metadata } from "next";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { articleInclude, liveWhere, toCardModel } from "@/lib/articles";
import { getServerSession } from "@/lib/session";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { ArticleCard } from "@/components/articles/article-card";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every article, author and topic.",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    author?: string;
    from?: string;
    to?: string;
  }>;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const hasFilters = Boolean(params.category || params.tag || params.author || params.from || params.to);

  const [session, categories] = await Promise.all([
    getServerSession(),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);

  const results =
    query || hasFilters
      ? await prisma.article.findMany({
          where: {
            ...liveWhere(),
            ...(query
              ? {
                  OR: [
                    { title: { contains: query } },
                    { excerpt: { contains: query } },
                    { content: { contains: query } },
                    { tags: { some: { tag: { name: { contains: query } } } } },
                    { author: { name: { contains: query } } },
                  ],
                }
              : {}),
            ...(params.category ? { category: { slug: params.category } } : {}),
            ...(params.tag ? { tags: { some: { tag: { slug: params.tag } } } } : {}),
            ...(params.author
              ? {
                  author: {
                    OR: [
                      { name: { contains: params.author } },
                      { username: { contains: params.author.toLowerCase() } },
                    ],
                  },
                }
              : {}),
            ...(params.from ? { publishedAt: { gte: new Date(params.from) } } : {}),
            ...(params.to ? { publishedAt: { lte: new Date(`${params.to}T23:59:59`) } } : {}),
          },
          include: articleInclude,
          orderBy: { publishedAt: "desc" },
          take: 30,
        })
      : [];

  // Record search history with result counts (deduped per hour) —
  // zero-result queries feed the search-intelligence report.
  if (query && query.length >= 2) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    prisma.searchHistory
      .findFirst({
        where: { userId: session?.user.id ?? null, query, createdAt: { gte: hourAgo } },
      })
      .then((dup) =>
        dup
          ? null
          : prisma.searchHistory.create({
              data: { userId: session?.user.id, query, results: results.length },
            })
      )
      .catch(() => {});
  }

  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Search</h1>

      {/* Filters */}
      <form action="/search" method="GET" className="mt-6 rounded-xl border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search articles, topics, authors…"
            className="pl-9"
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select name="category" defaultValue={params.category ?? ""} className={selectClass} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <Input name="tag" defaultValue={params.tag ?? ""} placeholder="Tag (e.g. ai)" aria-label="Tag" />
          <Input name="author" defaultValue={params.author ?? ""} placeholder="Author" aria-label="Author" />
          <Input type="date" name="from" defaultValue={params.from ?? ""} aria-label="From date" />
          <Input type="date" name="to" defaultValue={params.to ?? ""} aria-label="To date" />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="submit" className={buttonVariants({ variant: "accent", size: "sm" })}>
            Search
          </button>
          {(query || hasFilters) && (
            <a href="/search" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Clear
            </a>
          )}
        </div>
      </form>

      {query || hasFilters ? (
        <>
          <p className="mt-6 text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"}
            {query && (
              <>
                {" "}
                for <span className="font-semibold text-foreground">“{query}”</span>
              </>
            )}
          </p>
          {results.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((article) => (
                <ArticleCard key={article.id} article={toCardModel(article)} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed p-14 text-center">
              <Search className="size-8 text-muted-foreground" />
              <p className="mt-4 font-medium">No results found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try different keywords or loosen the filters.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-muted-foreground">
          Search across every article, or filter by category, tag, author and date.
        </p>
      )}
    </Container>
  );
}
