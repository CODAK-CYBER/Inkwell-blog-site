import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Bookmark, History, List, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { articleInclude, toCardModel } from "@/lib/articles";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { SavedItem } from "@/components/saved/saved-item";
import { ListManager } from "@/components/saved/list-manager";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Saved articles",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ list?: string; q?: string }>;
}

export default async function SavedPage({ searchParams }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/saved");
  const { list: listParam, q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  const [bookmarks, lists, history] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.readingList.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { bookmarks: true } } },
    }),
    prisma.readingHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { readAt: "desc" },
      take: 15,
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

  // Filter by view (all / archived / a specific list) and search query
  const view = listParam ?? "all";
  const visible = bookmarks
    .map((b) => ({ bookmark: b, article: bySlug.get(b.articleSlug) }))
    .filter((x) => x.article)
    .filter(({ bookmark }) =>
      view === "archived" ? bookmark.archived : !bookmark.archived && (view === "all" || bookmark.listId === view)
    )
    .filter(
      ({ article }) =>
        !query ||
        article!.title.toLowerCase().includes(query) ||
        article!.excerpt.toLowerCase().includes(query)
    );

  const tabs = [
    { key: "all", label: "All saved", icon: Bookmark, count: bookmarks.filter((b) => !b.archived).length },
    ...lists.map((l) => ({ key: l.id, label: l.name, icon: List, count: l._count.bookmarks })),
    { key: "archived", label: "Archived", icon: Archive, count: bookmarks.filter((b) => b.archived).length },
  ];

  return (
    <Container className="py-14">
      <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
        <Bookmark className="size-7 text-accent" />
        Your library
      </h1>
      <p className="mt-2 text-muted-foreground">
        Saved articles, custom reading lists, and your reading history.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar: lists */}
        <aside>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Reading lists">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={`/saved${tab.key === "all" ? "" : `?list=${tab.key}`}`}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  view === tab.key
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <tab.icon className="size-4" />
                <span className="truncate">{tab.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{tab.count}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-4">
            <ListManager
              lists={lists.map((l) => ({ id: l.id, name: l.name }))}
              activeListId={view !== "all" && view !== "archived" ? view : null}
            />
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <form action="/saved" method="GET" className="relative max-w-sm">
            {view !== "all" && <input type="hidden" name="list" value={view} />}
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={query} placeholder="Search your saved articles…" className="pl-9" />
          </form>

          {visible.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {visible.map(({ bookmark, article }) => (
                <SavedItem
                  key={bookmark.id}
                  bookmark={{
                    id: bookmark.id,
                    archived: bookmark.archived,
                    listId: bookmark.listId,
                    createdAt: bookmark.createdAt.toISOString(),
                  }}
                  article={toCardModel(article!)}
                  lists={lists.map((l) => ({ id: l.id, name: l.name }))}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed p-14 text-center">
              <p className="font-medium">
                {query ? "No saved articles match your search" : "Nothing here yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap the bookmark icon on any article to save it.
              </p>
              <Link href="/articles" className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-4")}>
                Browse articles
              </Link>
            </div>
          )}

          {/* Reading history */}
          <h2 className="mt-14 flex items-center gap-2 text-2xl font-bold">
            <History className="size-6 text-accent" />
            Reading history
          </h2>
          {history.length > 0 ? (
            <ul className="mt-4 divide-y">
              {history.map((h) => {
                const article = bySlug.get(h.articleSlug);
                if (!article) return null;
                return (
                  <li key={h.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/articles/${article.slug}`}
                        className="block truncate font-medium hover:text-accent"
                      >
                        {article.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(h.progress * 100)}% read
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {h.readAt.toLocaleDateString()}
                    </time>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Articles you read will appear here.</p>
          )}
        </div>
      </div>
    </Container>
  );
}
