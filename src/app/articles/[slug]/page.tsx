import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { articleInclude, liveWhere } from "@/lib/articles";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { EngagementBar } from "@/components/articles/engagement-bar";
import { FollowButton } from "@/components/follow-button";
import { buttonVariants } from "@/components/ui/button";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getArticle(slug: string) {
  return prisma.article.findFirst({
    where: { slug, ...liveWhere() },
    include: articleInclude,
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt,
    alternates: article.canonicalUrl ? { canonical: article.canonicalUrl } : undefined,
    openGraph: {
      title: article.seoTitle ?? article.title,
      description: article.seoDescription ?? article.excerpt,
      type: "article",
      ...(article.coverImage ? { images: [article.coverImage] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const session = await getServerSession();

  let article = await getArticle(slug);

  // Staff can preview unpublished articles.
  if (!article && session && hasPermission(session.user.role, { article: ["publish"] })) {
    article = await prisma.article.findFirst({ where: { slug }, include: articleInclude });
  }
  if (!article) notFound();

  const isLive = article.status === "published" ||
    (article.status === "scheduled" && article.scheduledFor && article.scheduledFor <= new Date());

  // View counter (fire-and-forget; real analytics arrive in Phase 11)
  if (isLive) {
    prisma.article
      .update({ where: { id: article.id }, data: { views: { increment: 1 } } })
      .catch(() => {});
  }

  const userId = session?.user.id;
  const authorKey = article.author.username ?? article.authorId;
  const [likeCount, liked, bookmarked, followingAuthor] = await Promise.all([
    prisma.like.count({ where: { articleSlug: slug } }),
    userId
      ? prisma.like.findUnique({ where: { userId_articleSlug: { userId, articleSlug: slug } } }).then(Boolean)
      : false,
    userId
      ? prisma.bookmark.findUnique({ where: { userId_articleSlug: { userId, articleSlug: slug } } }).then(Boolean)
      : false,
    userId
      ? prisma.follow
          .findUnique({
            where: {
              userId_targetType_targetKey: { userId, targetType: "author", targetKey: authorKey },
            },
          })
          .then(Boolean)
      : false,
  ]);

  const canEdit =
    session &&
    (article.authorId === session.user.id
      ? hasPermission(session.user.role, { article: ["updateOwn"] })
      : hasPermission(session.user.role, { article: ["update"] }));

  const html = renderMarkdown(article.content);

  return (
    <article>
      <Container className="max-w-3xl py-14">
        {!isLive && (
          <p className="mb-6 rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm">
            Staff preview — this article is <strong>{article.status}</strong> and not visible to readers.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {article.category && (
            <Link href={`/categories/${article.category.slug}`}>
              <Badge variant="accent">{article.category.name}</Badge>
            </Link>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {article.readingTime} min read
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="size-3" />
            {article.views.toLocaleString()} views
          </span>
          {canEdit && (
            <Link
              href={`/write/${article.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" }) + " ml-auto"}
            >
              Edit
            </Link>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/u/${article.author.username ?? ""}`}
            className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-secondary font-medium"
          >
            {article.author.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={article.author.image} alt={article.author.name} className="size-full object-cover" />
            ) : (
              article.author.name.charAt(0)
            )}
          </Link>
          <div className="mr-2">
            <Link href={`/u/${article.author.username ?? ""}`} className="text-sm font-medium hover:text-accent">
              {article.author.name}
            </Link>
            <time
              dateTime={(article.publishedAt ?? article.createdAt).toISOString()}
              className="block text-xs text-muted-foreground"
            >
              {formatDate(article.publishedAt ?? article.createdAt)}
            </time>
          </div>
          <FollowButton
            targetType="author"
            targetKey={authorKey}
            initialFollowing={followingAuthor}
            signedIn={Boolean(session)}
          />
        </div>

        <div className="mt-6 border-y py-2">
          <EngagementBar
            slug={slug}
            title={article.title}
            signedIn={Boolean(session)}
            initialLiked={liked}
            initialBookmarked={bookmarked}
            initialLikeCount={likeCount}
          />
        </div>

        {article.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImage}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-xl border object-cover"
          />
        ) : (
          <div className="mt-8 aspect-[16/9] rounded-xl bg-gradient-to-br from-secondary to-muted" />
        )}

        <div className="article-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />

        {article.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map(({ tag }) => (
              <Badge key={tag.id} variant="outline">
                #{tag.name}
              </Badge>
            ))}
          </div>
        )}
      </Container>
    </article>
  );
}
