import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mockArticles, mockCategories } from "@/lib/mock-data";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = mockCategories.find((c) => c.slug === slug);
  if (!category) return {};
  return { title: category.name, description: category.description };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = mockCategories.find((c) => c.slug === slug);
  if (!category) notFound();

  const articles = mockArticles.filter((a) => a.category.slug === slug);

  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{category.name}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
      {articles.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No articles in this category yet — content arrives in Phase 4.
        </p>
      )}
    </Container>
  );
}
