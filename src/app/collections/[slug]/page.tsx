import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { articleInclude, toCardModel } from "@/lib/articles";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await prisma.collection.findUnique({ where: { slug } });
  if (!collection) return {};
  return { title: collection.name, description: collection.description ?? undefined };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { article: { include: articleInclude } },
      },
    },
  });
  if (!collection) notFound();

  const articles = collection.items
    .map((i) => i.article)
    .filter(
      (a) =>
        a.status === "published" ||
        (a.status === "scheduled" && a.scheduledFor && a.scheduledFor <= new Date())
    );

  return (
    <>
      <div
        className="h-44 bg-gradient-to-r from-accent/30 via-accent-soft to-secondary bg-cover bg-center sm:h-56"
        style={collection.coverImage ? { backgroundImage: `url(${collection.coverImage})` } : undefined}
      />
      <Container className="py-10">
        <h1 className="text-3xl font-bold sm:text-4xl">{collection.name}</h1>
        {collection.description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{collection.description}</p>
        )}
        {articles.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={toCardModel(a)} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No articles in this collection yet.
          </p>
        )}
      </Container>
    </>
  );
}
