import type { Metadata } from "next";
import { Search } from "lucide-react";
import { mockArticles } from "@/lib/mock-data";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every article, author and topic.",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  // Naive filter over mock data; replaced by the real search engine in Phase 6.
  const results = query
    ? mockArticles.filter((a) =>
        [a.title, a.excerpt, a.category.name, a.author.name, ...a.tags]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : [];

  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Search</h1>
      {query ? (
        <>
          <p className="mt-2 text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"} for{" "}
            <span className="font-semibold text-foreground">“{query}”</span>
          </p>
          {results.length > 0 ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed p-14 text-center">
              <Search className="size-8 text-muted-foreground" />
              <p className="mt-4 font-medium">No results found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try different keywords or browse the categories instead.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-muted-foreground">
          Type in the search bar above (or press Ctrl+K) to find articles.
        </p>
      )}
    </Container>
  );
}
