import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { articleInclude, toCardModel } from "@/lib/articles";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";

export const metadata: Metadata = {
  title: "Saved articles",
  robots: { index: false },
};

export default async function SavedPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/saved");

  const [bookmarks, history] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.readingHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { readAt: "desc" },
      take: 20,
    }),
  ]);

  const slugs = [
    ...new Set([...bookmarks.map((b) => b.articleSlug), ...history.map((h) => h.articleSlug)]),
  ];
  const articles = await prisma.article.findMany({
    where: { slug: { in: slugs } },
    include: articleInclude,
  });
  const bySlug = new Map(articles.map((a) => [a.slug, a]));

  const bookmarkedArticles = bookmarks
    .map((b) => bySlug.get(b.articleSlug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map(toCardModel);

  const historyItems = history
    .map((h) => {
      const row = bySlug.get(h.articleSlug);
      return { article: row ? toCardModel(row) : undefined, readAt: h.readAt };
    })
    .filter((h) => Boolean(h.article));

  return (
    <Container className="py-14">
      <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
        <Bookmark className="size-7 text-accent" />
        Saved articles
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your reading list — saved for whenever you&apos;re ready.
      </p>

      {bookmarkedArticles.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarkedArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed p-14 text-center">
          <p className="font-medium">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the bookmark icon on any article to save it for later.
          </p>
          <Link
            href="/articles"
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            Browse articles →
          </Link>
        </div>
      )}

      <h2 className="mt-16 flex items-center gap-2 text-2xl font-bold">
        <History className="size-6 text-accent" />
        Reading history
      </h2>
      {historyItems.length > 0 ? (
        <ul className="mt-6 divide-y">
          {historyItems.map(({ article, readAt }) => (
            <li key={article!.id} className="flex items-center justify-between gap-4 py-3">
              <Link
                href={`/articles/${article!.slug}`}
                className="min-w-0 truncate font-medium hover:text-accent"
              >
                {article!.title}
              </Link>
              <time className="shrink-0 text-xs text-muted-foreground">
                {readAt.toLocaleDateString()}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Articles you read will appear here.
        </p>
      )}
    </Container>
  );
}
