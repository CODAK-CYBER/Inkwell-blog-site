import type { Metadata } from "next";
import Link from "next/link";
import { PenSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { Container } from "@/components/ui/container";
import { FollowButton } from "@/components/follow-button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Authors",
  description: "The writers behind the stories — follow your favorites.",
};

export default async function AuthorsPage() {
  const session = await getServerSession();

  const authors = await prisma.user.findMany({
    where: {
      role: { in: ["author", "editor", "admin", "superadmin"] },
      articles: { some: { status: "published" } },
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      _count: { select: { articles: { where: { status: "published" } } } },
      articles: {
        where: { status: "published" },
        select: { views: true },
      },
    },
  });

  const enriched = await Promise.all(
    authors.map(async (a) => {
      const key = a.username ?? a.id;
      const [followers, following] = await Promise.all([
        prisma.follow.count({ where: { targetType: "author", targetKey: key } }),
        session
          ? prisma.follow
              .findUnique({
                where: {
                  userId_targetType_targetKey: {
                    userId: session.user.id,
                    targetType: "author",
                    targetKey: key,
                  },
                },
              })
              .then(Boolean)
          : Promise.resolve(false),
      ]);
      return {
        ...a,
        key,
        followers,
        following,
        totalViews: a.articles.reduce((sum, x) => sum + x.views, 0),
      };
    })
  );

  enriched.sort((a, b) => b.followers - a.followers || b.totalViews - a.totalViews);

  return (
    <Container className="py-14">
      <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
        <PenSquare className="size-7 text-accent" />
        Authors
      </h1>
      <p className="mt-2 text-muted-foreground">
        The writers behind the stories. Follow them to shape your feed.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enriched.map((author) => (
          <div key={author.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <Link
                href={`/u/${author.key}`}
                className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-serif text-lg font-bold text-accent-foreground"
              >
                {author.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={author.image} alt="" className="size-full object-cover" />
                ) : (
                  author.name.charAt(0)
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${author.key}`} className="block truncate font-semibold hover:text-accent">
                  {author.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  @{author.username ?? author.id}
                </p>
              </div>
              {session?.user.id !== author.id && (
                <FollowButton
                  targetType="author"
                  targetKey={author.key}
                  initialFollowing={author.following}
                  signedIn={Boolean(session)}
                />
              )}
            </div>
            {author.bio && (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{author.bio}</p>
            )}
            <div className="mt-3 flex gap-2">
              <Badge variant="secondary">{author._count.articles} articles</Badge>
              <Badge variant="secondary">{author.followers} followers</Badge>
              <Badge variant="secondary">{author.totalViews.toLocaleString()} views</Badge>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
