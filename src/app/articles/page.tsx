import type { Metadata } from "next";
import { getLiveArticles, toCardModel } from "@/lib/articles";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";

export const metadata: Metadata = {
  title: "Articles",
  description: "Browse the latest articles across every category.",
};

export default async function ArticlesPage() {
  const articles = await getLiveArticles();

  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">All articles</h1>
      <p className="mt-2 text-muted-foreground">
        Everything we&apos;ve published, newest first.
      </p>
      {articles.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={toCardModel(article)} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Nothing published yet — check back soon.
        </p>
      )}
    </Container>
  );
}
