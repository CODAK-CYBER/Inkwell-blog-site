import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CategoriesManager } from "@/components/admin/categories-manager";

export const metadata: Metadata = {
  title: "Categories — admin",
  robots: { index: false },
};

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { articles: true } } },
  });

  return (
    <CategoriesManager
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? "",
        icon: c.icon ?? "",
        image: c.image ?? "",
        parentId: c.parentId,
        sortOrder: c.sortOrder,
        seoTitle: c.seoTitle ?? "",
        seoDescription: c.seoDescription ?? "",
        articleCount: c._count.articles,
      }))}
    />
  );
}
