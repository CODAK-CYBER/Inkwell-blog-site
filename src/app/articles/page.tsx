import type { Metadata } from "next";
import { mockArticles } from "@/lib/mock-data";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";

export const metadata: Metadata = {
  title: "Articles",
  description: "Browse the latest articles across every category.",
};

export default function ArticlesPage() {
  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">All articles</h1>
      <p className="mt-2 text-muted-foreground">
        Everything we&apos;ve published, newest first.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {mockArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </Container>
  );
}
