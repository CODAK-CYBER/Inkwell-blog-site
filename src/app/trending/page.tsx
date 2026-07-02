import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTrendingArticles, type TrendingWindow } from "@/lib/trending";
import { toCardModel } from "@/lib/articles";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Trending",
  description: "What everyone is reading right now.",
};

const WINDOWS: Array<{ value: TrendingWindow; label: string }> = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

interface Props {
  searchParams: Promise<{ window?: string; category?: string }>;
}

export default async function TrendingPage({ searchParams }: Props) {
  const params = await searchParams;
  const window = (WINDOWS.find((w) => w.value === params.window)?.value ?? "week") as TrendingWindow;
  const categorySlug = params.category;

  const [trending, categories] = await Promise.all([
    getTrendingArticles({ window, categorySlug, take: 12 }),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" } }),
  ]);

  const link = (w: TrendingWindow, c?: string) =>
    `/trending?window=${w}${c ? `&category=${c}` : ""}`;

  return (
    <Container className="py-14">
      <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
        <Flame className="size-8 text-accent" />
        Trending
      </h1>
      <p className="mt-2 text-muted-foreground">
        Ranked by views, likes and saves — updated continuously.
      </p>

      {/* Time window tabs */}
      <div className="mt-6 flex gap-1 border-b">
        {WINDOWS.map((w) => (
          <Link
            key={w.value}
            href={link(w.value, categorySlug)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              window === w.value
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {/* Category filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={link(window)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            !categorySlug ? "border-accent bg-accent-soft" : "hover:border-accent"
          )}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={link(window, c.slug)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              categorySlug === c.slug ? "border-accent bg-accent-soft" : "hover:border-accent"
            )}
          >
            {c.icon} {c.name}
          </Link>
        ))}
      </div>

      {trending.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map(({ article }, i) => (
            <div key={article.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-2 -top-3 z-10 flex size-8 items-center justify-center rounded-full bg-accent font-serif text-sm font-bold text-accent-foreground shadow"
              >
                {i + 1}
              </span>
              <ArticleCard article={toCardModel(article)} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Not enough activity in this window yet.
        </p>
      )}
    </Container>
  );
}
