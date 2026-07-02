import Link from "next/link";
import { ArrowRight, Bookmark, Flame, History, Sparkles, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { articleInclude, liveWhere, toCardModel } from "@/lib/articles";
import { getRecommendations, getSuggestedAuthors } from "@/lib/recommendations";
import { getTrendingArticles } from "@/lib/trending";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";
import { FollowButton } from "@/components/follow-button";
import { Badge } from "@/components/ui/badge";

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Icon className="size-5 text-accent" />
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
          View all <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export async function PersonalizedHome({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [
    recommended,
    continueReading,
    interests,
    follows,
    trending,
    editorPicks,
    saved,
    suggestedAuthors,
  ] = await Promise.all([
    getRecommendations(userId, 6),
    prisma.readingHistory.findMany({
      where: { userId, progress: { gt: 0.05, lt: 0.9 } },
      orderBy: { readAt: "desc" },
      take: 3,
    }),
    prisma.userInterest.findMany({ where: { userId } }),
    prisma.follow.findMany({ where: { userId, targetType: "category" } }),
    getTrendingArticles({ window: "week", take: 3 }),
    prisma.article.findMany({
      where: { ...liveWhere(), featured: true },
      include: articleInclude,
      orderBy: { publishedAt: "desc" },
      take: 2,
    }),
    prisma.bookmark.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    getSuggestedAuthors(userId, 4),
  ]);

  const interestSlugs = [...new Set([...interests.map((i) => i.topic), ...follows.map((f) => f.targetKey)])];

  const [latestInInterests, interestCategories, suggestedCategories, continueArticles, savedArticles] =
    await Promise.all([
      interestSlugs.length
        ? prisma.article.findMany({
            where: { ...liveWhere(), category: { slug: { in: interestSlugs } } },
            include: articleInclude,
            orderBy: { publishedAt: "desc" },
            take: 6,
          })
        : Promise.resolve([]),
      prisma.category.findMany({ where: { slug: { in: interestSlugs } }, orderBy: { sortOrder: "asc" } }),
      prisma.category.findMany({
        where: { slug: { notIn: interestSlugs }, parentId: null },
        include: { _count: { select: { articles: { where: liveWhere() } } } },
        orderBy: { articles: { _count: "desc" } },
        take: 4,
      }),
      continueReading.length
        ? prisma.article.findMany({
            where: { slug: { in: continueReading.map((h) => h.articleSlug) }, ...liveWhere() },
            include: articleInclude,
          })
        : Promise.resolve([]),
      saved.length
        ? prisma.article.findMany({
            where: { slug: { in: saved.map((b) => b.articleSlug) }, ...liveWhere() },
            include: articleInclude,
          })
        : Promise.resolve([]),
    ]);

  const continueItems = continueReading
    .map((h) => ({ history: h, article: continueArticles.find((a) => a.slug === h.articleSlug) }))
    .filter((x) => x.article);

  return (
    <>
      {/* Greeting + topics */}
      <section className="border-b bg-card">
        <Container className="py-8">
          <h1 className="font-serif text-2xl font-bold sm:text-3xl">
            Good to see you, {userName.split(" ")[0]} 👋
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {interestCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="rounded-full border bg-background px-3 py-1 text-sm transition-colors hover:border-accent hover:text-accent"
              >
                {c.icon} {c.name}
              </Link>
            ))}
            <Link href="/settings/interests" className="text-sm font-medium text-accent hover:underline">
              Edit interests
            </Link>
          </div>
        </Container>
      </section>

      {/* Continue reading */}
      {continueItems.length > 0 && (
        <section className="border-b bg-accent-soft/30 py-8">
          <Container>
            <SectionHeader icon={History} title="Continue reading" href="/saved" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {continueItems.map(({ history, article }) => (
                <Link
                  key={history.id}
                  href={`/articles/${article!.slug}`}
                  className="group rounded-xl border bg-background p-4 transition-all hover:border-accent"
                >
                  <p className="line-clamp-2 font-serif font-semibold group-hover:text-accent">
                    {article!.title}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.round(history.progress * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {Math.round(history.progress * 100)}% read · {article!.readingTime} min total
                  </p>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Recommended */}
      <section className="py-12">
        <Container>
          <SectionHeader
            icon={Sparkles}
            title="Recommended for you"
            subtitle="Based on your interests, follows and reading history"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((a) => (
              <ArticleCard key={a.id} article={toCardModel(a)} />
            ))}
          </div>
        </Container>
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section className="border-y bg-card py-12">
          <Container>
            <SectionHeader icon={Flame} title="Trending this week" href="/trending" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map(({ article }) => (
                <ArticleCard key={article.id} article={toCardModel(article)} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Latest in your interests */}
      {latestInInterests.length > 0 && (
        <section className="py-12">
          <Container>
            <SectionHeader icon={ArrowRight} title="Latest in your interests" href="/articles" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestInInterests.map((a) => (
                <ArticleCard key={a.id} article={toCardModel(a)} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Editor's picks + Saved */}
      <section className="border-t bg-card py-12">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader icon={Sparkles} title="Editor's picks for you" />
            <div className="grid gap-6">
              {editorPicks.map((a) => (
                <ArticleCard key={a.id} article={toCardModel(a)} />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader icon={Bookmark} title="Saved for later" href="/saved" />
            {savedArticles.length > 0 ? (
              <ul className="divide-y rounded-xl border bg-background px-4">
                {savedArticles.map((a) => (
                  <li key={a.id} className="py-3">
                    <Link href={`/articles/${a.slug}`} className="font-medium hover:text-accent">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {a.category?.name} · {a.readingTime} min read
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Tap the bookmark on any article to save it for later.
              </p>
            )}

            {/* Suggested authors */}
            <div className="mt-8">
              <SectionHeader icon={UserPlus} title="Authors you may like" href="/authors" />
              <ul className="space-y-3">
                {suggestedAuthors.map((author) => (
                  <li key={author.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
                    <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-accent font-medium text-accent-foreground">
                      {author.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.image} alt="" className="size-full object-cover" />
                      ) : (
                        author.name.charAt(0)
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/u/${author.username ?? author.id}`}
                        className="truncate font-medium hover:text-accent"
                      >
                        {author.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {author._count.articles} article{author._count.articles === 1 ? "" : "s"} ·{" "}
                        {author.followers} follower{author.followers === 1 ? "" : "s"}
                      </p>
                    </div>
                    <FollowButton
                      targetType="author"
                      targetKey={author.username ?? author.id}
                      initialFollowing={false}
                      signedIn
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Suggested categories */}
      {suggestedCategories.length > 0 && (
        <section className="py-12">
          <Container>
            <SectionHeader
              icon={ArrowRight}
              title="Explore something new"
              subtitle="Categories you haven't followed yet"
              href="/categories"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {suggestedCategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="group rounded-xl border bg-card p-4 transition-all hover:border-accent"
                >
                  <p className="font-serif font-semibold group-hover:text-accent">
                    {c.icon} {c.name}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {c._count.articles} articles
                  </Badge>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
