import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { mockArticles } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = mockArticles.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: { title: article.title, description: article.excerpt, type: "article" },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = mockArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  return (
    <article>
      <Container className="max-w-3xl py-14">
        <div className="flex items-center gap-2">
          <Link href={`/categories/${article.category.slug}`}>
            <Badge variant="accent">{article.category.name}</Badge>
          </Link>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {article.readingTimeMinutes} min read
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {article.excerpt}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary font-medium">
            {article.author.name.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-medium">{article.author.name}</p>
            <time dateTime={article.publishedAt} className="text-xs text-muted-foreground">
              {formatDate(article.publishedAt)}
            </time>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Cover image placeholder until media pipeline arrives in Phase 4 */}
        <div className="aspect-[16/9] rounded-xl bg-gradient-to-br from-secondary to-muted" />

        <div className="prose mt-8 space-y-5 leading-relaxed text-foreground/90">
          <p>
            This is a placeholder article body. The full article system — rich
            text content, images, embeds, code blocks, table of contents and
            related posts — is built in Phase 4 (Blog &amp; Article Management).
          </p>
          <p>
            For now, this page demonstrates the article layout, typography,
            metadata handling and routing that the rest of the platform will
            build on.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              #{tag}
            </Badge>
          ))}
        </div>
      </Container>
    </article>
  );
}
