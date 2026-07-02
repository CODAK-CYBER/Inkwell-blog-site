import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CollectionsManager } from "@/components/admin/collections-manager";

export const metadata: Metadata = {
  title: "Collections — admin",
  robots: { index: false },
};

export default async function AdminCollectionsPage() {
  const [collections, articles] = await Promise.all([
    prisma.collection.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: { select: { articleId: true } } },
    }),
    prisma.article.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      select: { id: true, title: true },
      take: 200,
    }),
  ]);

  return (
    <CollectionsManager
      collections={collections.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? "",
        coverImage: c.coverImage ?? "",
        featured: c.featured,
        articleIds: c.items.map((i) => i.articleId),
      }))}
      articles={articles}
    />
  );
}
