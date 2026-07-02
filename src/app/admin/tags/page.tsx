import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { TagsManager } from "@/components/admin/tags-manager";

export const metadata: Metadata = {
  title: "Tags — admin",
  robots: { index: false },
};

export default async function AdminTagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { articles: { _count: "desc" } },
    include: { _count: { select: { articles: true } } },
  });

  return (
    <TagsManager
      tags={tags.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        count: t._count.articles,
      }))}
    />
  );
}
