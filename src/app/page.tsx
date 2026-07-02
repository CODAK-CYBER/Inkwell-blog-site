import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { getServerSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getLiveArticles, liveWhere, toCardModel } from "@/lib/articles";
import { TOPICS } from "@/lib/constants";
import { Container } from "@/components/ui/container";
import { buttonVariants, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArticleCard } from "@/components/articles/article-card";

export default async function HomePage() {
  // Signed-in users finish onboarding before seeing the homepage.
  const session = await getServerSession();
  if (session && !session.user.onboardingComplete) redirect("/onboarding");

  const [featured, latestAll, categories, interests] = await Promise.all([
    getLiveArticles({ featured: true, take: 2 }),
    getLiveArticles({ take: 8 }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      take: 6,
      include: { _count: { select: { articles: { where: liveWhere() } } } },
    }),
    session
      ? prisma.userInterest.findMany({ where: { userId: session.user.id } })
      : Promise.resolve([]),
  ]);

  const featuredIds = new Set(featured.map((a) => a.id));
  const latest = latestAll.filter((a) => !featuredIds.has(a.id)).slice(0, 6);

  const interestTopics = interests
    .map((i) => TOPICS.find((t) => t.slug === i.topic))
    .filter((t): t is (typeof TOPICS)[number] => Boolean(t));

  return (
    <>
      {/* Your topics (personalized feed lands in Phase 3) */}
      {session && interestTopics.length > 0 && (
        <section className="border-b bg-accent-soft/40">
          <Container className="flex flex-wrap items-center gap-2 py-3">
            <span className="text-sm font-medium text-muted-foreground">Your topics:</span>
            {interestTopics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/categories/${topic.slug}`}
                className="rounded-full border bg-background px-3 py-1 text-sm transition-colors hover:border-accent hover:text-accent"
              >
                {topic.emoji} {topic.label}
              </Link>
            ))}
          </Container>
        </section>
      )}

      {/* Hero */}
      <section className="border-b bg-card">
        <Container className="py-16 text-center sm:py-24">
          <Badge variant="accent" className="mb-5 animate-fade-in gap-1.5 px-3 py-1">
            <Sparkles className="size-3.5" />
            Welcome to {siteConfig.name}
          </Badge>
          <h1 className="mx-auto max-w-3xl animate-fade-up text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {siteConfig.tagline}, written by people who care.
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-fade-up text-lg text-muted-foreground [animation-delay:100ms]">
            In-depth journalism and essays on technology, culture, business and
            science — personalized to what you love reading.
          </p>
          <div className="mt-8 flex animate-fade-up justify-center gap-3 [animation-delay:200ms]">
            <Link href="/articles" className={buttonVariants({ variant: "accent", size: "lg" })}>
              Start reading
              <ArrowRight />
            </Link>
            <Link href="/categories" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Explore categories
            </Link>
          </div>
        </Container>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="py-14">
          <Container>
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">Featured stories</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hand-picked reads from our editors
                </p>
              </div>
              <Link
                href="/articles"
                className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                View all <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {featured.map((article) => (
                <ArticleCard key={article.id} article={toCardModel(article)} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Categories */}
      <section className="border-y bg-card py-14">
        <Container>
          <h2 className="text-2xl font-bold sm:text-3xl">Browse by category</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow the topics that matter to you
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group rounded-xl border bg-background p-5 transition-all hover:border-accent hover:shadow-sm"
              >
                <h3 className="flex items-center gap-2 font-serif text-lg font-semibold group-hover:text-accent">
                  {category.icon && <span>{category.icon}</span>}
                  {category.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {category.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {category._count.articles} article{category._count.articles === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Latest */}
      <section className="py-14">
        <Container>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Latest articles</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fresh off the press</p>
            </div>
            <Link
              href="/articles"
              className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((article) => (
              <ArticleCard key={article.id} article={toCardModel(article)} />
            ))}
          </div>
        </Container>
      </section>

      {/* Newsletter */}
      <section className="border-t bg-card py-16">
        <Container className="max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Never miss a story</h2>
          <p className="mt-2 text-muted-foreground">
            Get the best of {siteConfig.name} in your inbox, every week. No spam,
            unsubscribe anytime.
          </p>
          <form className="mx-auto mt-6 flex max-w-md gap-2">
            <Input type="email" placeholder="you@example.com" aria-label="Email address" required />
            <Button variant="accent" type="submit">
              Subscribe
            </Button>
          </form>
        </Container>
      </section>
    </>
  );
}
