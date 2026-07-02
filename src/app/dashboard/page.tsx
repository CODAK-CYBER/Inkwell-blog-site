import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Circle,
  Flame,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { getRecommendations } from "@/lib/recommendations";
import { getReadingStreak } from "@/lib/streak";
import { toCardModel } from "@/lib/articles";
import { TOPICS } from "@/lib/constants";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Your dashboard",
  robots: { index: false },
};

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Icon className="size-4 text-accent" />
      <p className="mt-2 font-serif text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/dashboard");
  const userId = session.user.id;

  const [history, likes, bookmarks, follows, interests, streak, recommendations, user] =
    await Promise.all([
      prisma.readingHistory.findMany({
        where: { userId },
        orderBy: { readAt: "desc" },
      }),
      prisma.like.count({ where: { userId } }),
      prisma.bookmark.count({ where: { userId, archived: false } }),
      prisma.follow.findMany({ where: { userId } }),
      prisma.userInterest.findMany({ where: { userId } }),
      getReadingStreak(userId),
      getRecommendations(userId, 3),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);

  const readSlugs = history.map((h) => h.articleSlug);
  const readArticles = readSlugs.length
    ? await prisma.article.findMany({
        where: { slug: { in: readSlugs } },
        select: { slug: true, title: true, readingTime: true },
      })
    : [];
  const bySlug = new Map(readArticles.map((a) => [a.slug, a]));
  const minutesRead = history.reduce((sum, h) => {
    const article = bySlug.get(h.articleSlug);
    return sum + (article ? article.readingTime * Math.max(h.progress, 0.3) : 0);
  }, 0);

  const followedAuthors = follows.filter((f) => f.targetType === "author");
  const followedTopics = follows.filter((f) => f.targetType === "category");

  const interestTopics = interests
    .map((i) => TOPICS.find((t) => t.slug === i.topic))
    .filter((t): t is (typeof TOPICS)[number] => Boolean(t));

  // Account progress checklist
  const checklist = [
    { label: "Verified email", done: Boolean(user.emailVerified) },
    { label: "Chose your interests", done: interests.length > 0 },
    { label: "Added a bio", done: Boolean(user.bio) },
    { label: "Added a profile photo", done: Boolean(user.image) },
    { label: "Followed an author", done: followedAuthors.length > 0 },
    { label: "Saved an article", done: bookmarks > 0 },
    { label: "Enabled two-factor auth", done: Boolean(user.twoFactorEnabled) },
  ];
  const progress = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="text-3xl font-bold">Your dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your reading life at a glance.
      </p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={Flame} label="Day streak" value={streak} />
        <Stat icon={BookOpen} label="Articles read" value={history.length} />
        <Stat icon={BookOpen} label="Minutes read" value={Math.round(minutesRead)} />
        <Stat icon={Heart} label="Likes given" value={likes} />
        <Stat icon={Bookmark} label="Saved" value={bookmarks} />
        <Stat icon={Users} label="Following" value={follows.length} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recommendations */}
        <section className="lg:col-span-2">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="size-5 text-accent" />
            Picked for you
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((a) => (
              <ArticleCard key={a.id} article={toCardModel(a)} />
            ))}
          </div>

          {/* Recent reading */}
          <h2 className="mt-10 text-xl font-bold">Recent reading</h2>
          {history.length > 0 ? (
            <ul className="mt-3 divide-y rounded-xl border bg-card px-4">
              {history.slice(0, 6).map((h) => {
                const article = bySlug.get(h.articleSlug);
                if (!article) return null;
                return (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="min-w-0 truncate text-sm font-medium hover:text-accent"
                    >
                      {article.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {Math.round(h.progress * 100)}% · {h.readAt.toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Start reading and your history will appear here.
            </p>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Account progress */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">Account progress</h2>
              <Badge variant="accent">{progress}%</Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="size-4 text-accent" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/50" />
                  )}
                  <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Followed topics */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-serif text-lg font-semibold">Your topics</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {interestTopics.map((t) => (
                <Link key={t.slug} href={`/categories/${t.slug}`}>
                  <Badge variant="secondary">
                    {t.emoji} {t.label}
                  </Badge>
                </Link>
              ))}
              {followedTopics.map((f) => (
                <Link key={f.id} href={`/categories/${f.targetKey}`}>
                  <Badge variant="outline">{f.targetKey}</Badge>
                </Link>
              ))}
            </div>
            <Link
              href="/settings/interests"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Edit interests →
            </Link>
          </div>

          {/* Followed authors */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-serif text-lg font-semibold">Followed authors</h2>
            {followedAuthors.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {followedAuthors.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/u/${f.targetKey}`}
                      className="text-sm font-medium hover:text-accent"
                    >
                      @{f.targetKey}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                <Link href="/authors" className="text-accent hover:underline">
                  Discover authors
                </Link>{" "}
                to follow.
              </p>
            )}
          </div>
        </aside>
      </div>
    </Container>
  );
}
