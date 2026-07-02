import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLiveArticles, toCardModel } from "@/lib/articles";
import { getServerSession } from "@/lib/session";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";
import { FollowButton } from "@/components/follow-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description ?? undefined,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const [articles, session] = await Promise.all([
    getLiveArticles({ categorySlug: slug }),
    getServerSession(),
  ]);

  const following = session
    ? await prisma.follow
        .findUnique({
          where: {
            userId_targetType_targetKey: {
              userId: session.user.id,
              targetType: "category",
              targetKey: slug,
            },
          },
        })
        .then(Boolean)
    : false;

  return (
    <Container className="py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-3xl font-bold sm:text-4xl">
          {category.icon && <span>{category.icon}</span>}
          {category.name}
        </h1>
        <FollowButton
          targetType="category"
          targetKey={slug}
          initialFollowing={following}
          signedIn={Boolean(session)}
          label="Follow topic"
        />
      </div>
      <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
      {articles.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={toCardModel(article)} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No articles in this category yet.
        </p>
      )}
    </Container>
  );
}
