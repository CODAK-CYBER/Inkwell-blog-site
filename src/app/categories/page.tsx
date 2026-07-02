import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/articles";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Categories",
  description: "Explore every topic we cover, from technology to travel.",
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      children: { orderBy: { sortOrder: "asc" } },
      _count: { select: { articles: { where: liveWhere() } } },
    },
  });

  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Categories</h1>
      <p className="mt-2 text-muted-foreground">Follow the topics that matter to you.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group rounded-xl border bg-card p-6 transition-all hover:border-accent hover:shadow-sm"
          >
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold group-hover:text-accent">
              {category.icon && <span>{category.icon}</span>}
              {category.name}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {category.description}
            </p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {category._count.articles} article{category._count.articles === 1 ? "" : "s"}
              {category.children.length > 0 && ` · ${category.children.length} subtopics`}
            </p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
