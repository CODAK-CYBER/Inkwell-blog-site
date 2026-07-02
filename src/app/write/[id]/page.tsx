import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { canPublish, hasPermission } from "@/lib/rbac";
import { ArticleEditor } from "@/components/editor/article-editor";

export const metadata: Metadata = {
  title: "Edit article",
  robots: { index: false },
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect(`/login?next=/write/${id}`);

  const article = await prisma.article.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });
  if (!article) notFound();

  const ownsIt = article.authorId === session.user.id;
  const allowed = ownsIt
    ? hasPermission(session.user.role, { article: ["updateOwn"] })
    : hasPermission(session.user.role, { article: ["update"] });
  if (!allowed) redirect("/");

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <ArticleEditor
      categories={categories}
      canPublish={canPublish(session.user.role)}
      initial={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        coverImage: article.coverImage ?? "",
        categoryId: article.categoryId ?? "",
        tags: article.tags.map((t) => t.tag.name),
        seoTitle: article.seoTitle ?? "",
        seoDescription: article.seoDescription ?? "",
        canonicalUrl: article.canonicalUrl ?? "",
        status: article.status,
      }}
    />
  );
}
