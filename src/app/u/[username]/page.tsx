import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Globe, Lock, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { TOPICS } from "@/lib/constants";
import { articleInclude, liveWhere, toCardModel } from "@/lib/articles";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ArticleCard } from "@/components/articles/article-card";
import { FollowButton } from "@/components/follow-button";
import {
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  XTwitterIcon,
  YoutubeIcon,
} from "@/components/icons/social";

interface Props {
  params: Promise<{ username: string }>;
}

async function findProfileUser(username: string) {
  return prisma.user.findFirst({
    where: { OR: [{ username: username.toLowerCase() }, { id: username }] },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await findProfileUser(username);
  if (!user || user.profileVisibility === "private") return { title: "Profile" };
  return {
    title: `${user.name} (@${user.displayUsername ?? user.username})`,
    description: user.bio ?? `${user.name}'s profile`,
  };
}

const SOCIAL_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  twitter: XTwitterIcon,
  github: GithubIcon,
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YoutubeIcon,
};

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const [user, session] = await Promise.all([findProfileUser(username), getServerSession()]);
  if (!user) notFound();

  const isSelf = session?.user.id === user.id;

  if (user.profileVisibility === "private" && !isSelf) {
    return (
      <Container className="flex flex-col items-center py-24 text-center">
        <span className="rounded-full bg-secondary p-4">
          <Lock className="size-8 text-muted-foreground" />
        </span>
        <h1 className="mt-6 text-2xl font-bold">This profile is private</h1>
        <p className="mt-2 text-muted-foreground">
          @{user.displayUsername ?? user.username} has chosen to keep their profile hidden.
        </p>
      </Container>
    );
  }

  const [interests, followerCount, followingSelf, publishedArticles] = await Promise.all([
    user.showReadingActivity
      ? prisma.userInterest.findMany({ where: { userId: user.id } })
      : Promise.resolve([]),
    prisma.follow.count({
      where: { targetType: "author", targetKey: user.username ?? user.id },
    }),
    session && !isSelf
      ? prisma.follow
          .findUnique({
            where: {
              userId_targetType_targetKey: {
                userId: session.user.id,
                targetType: "author",
                targetKey: user.username ?? user.id,
              },
            },
          })
          .then(Boolean)
      : Promise.resolve(false),
    prisma.article.findMany({
      where: { authorId: user.id, ...liveWhere() },
      include: articleInclude,
      orderBy: { publishedAt: "desc" },
      take: 9,
    }),
  ]);

  const totalViews = publishedArticles.reduce((sum, a) => sum + a.views, 0);

  let socialLinks: Record<string, string> = {};
  try {
    socialLinks = user.socialLinks ? JSON.parse(user.socialLinks) : {};
  } catch {
    // ignore
  }

  const interestTopics = interests
    .map((i) => TOPICS.find((t) => t.slug === i.topic))
    .filter((t): t is (typeof TOPICS)[number] => Boolean(t));

  return (
    <>
      {/* Cover */}
      <div
        className="h-40 bg-gradient-to-r from-accent/30 via-accent-soft to-secondary bg-cover bg-center sm:h-56"
        style={user.coverImage ? { backgroundImage: `url(${user.coverImage})` } : undefined}
      />

      <Container className="pb-16">
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <span className="flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-accent font-serif text-3xl font-bold text-accent-foreground">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="size-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </span>
            <div className="pb-1">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-sm text-muted-foreground">
                @{user.displayUsername ?? user.username ?? user.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pb-1">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{followerCount}</span>{" "}
              follower{followerCount === 1 ? "" : "s"}
            </span>
            {publishedArticles.length > 0 && (
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{publishedArticles.length}</span>{" "}
                article{publishedArticles.length === 1 ? "" : "s"} ·{" "}
                <span className="font-semibold text-foreground">{totalViews.toLocaleString()}</span> views
              </span>
            )}
            {isSelf ? (
              <Link
                href="/settings"
                className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Edit profile
              </Link>
            ) : (
              <FollowButton
                targetType="author"
                targetKey={user.username ?? user.id}
                initialFollowing={followingSelf}
                signedIn={Boolean(session)}
              />
            )}
          </div>
        </div>

        {user.bio && <p className="mt-6 max-w-2xl leading-relaxed">{user.bio}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {user.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {user.location}
            </span>
          )}
          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-accent hover:underline"
            >
              <Globe className="size-4" />
              {user.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            Joined{" "}
            {user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>

        {Object.entries(socialLinks).some(([, v]) => v) && (
          <div className="mt-4 flex gap-2">
            {Object.entries(socialLinks)
              .filter(([, url]) => url)
              .map(([key, url]) => {
                const Icon = SOCIAL_ICONS[key];
                if (!Icon) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Icon width={16} height={16} />
                  </a>
                );
              })}
          </div>
        )}

        {interestTopics.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Followed topics
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {interestTopics.map((topic) => (
                <Link key={topic.slug} href={`/categories/${topic.slug}`}>
                  <Badge variant="secondary" className="px-3 py-1 text-sm">
                    {topic.emoji} {topic.label}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {publishedArticles.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-xl font-bold">Published articles</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {publishedArticles.map((a) => (
                <ArticleCard key={a.id} article={toCardModel(a)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No published articles yet. Comments and reading achievements arrive in later phases.
          </div>
        )}
      </Container>
    </>
  );
}
