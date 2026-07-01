import Link from "next/link";
import { Clock } from "lucide-react";
import type { Article } from "@/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      {/* Image placeholder until media arrives in Phase 4 */}
      <Link
        href={`/articles/${article.slug}`}
        className="block aspect-[16/9] bg-gradient-to-br from-secondary to-muted transition-opacity group-hover:opacity-90"
        aria-hidden
        tabIndex={-1}
      />
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Badge variant="accent">{article.category.name}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {article.readingTimeMinutes} min read
          </span>
        </div>
        <h3 className="mt-3 font-serif text-lg font-semibold leading-snug">
          <Link
            href={`/articles/${article.slug}`}
            className="transition-colors group-hover:text-accent"
          >
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {article.excerpt}
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-secondary font-medium text-foreground">
            {article.author.name.charAt(0)}
          </span>
          <span className="font-medium text-foreground">{article.author.name}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </div>
      </CardContent>
    </Card>
  );
}
