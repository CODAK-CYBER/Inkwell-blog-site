import Link from "next/link";
import { Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/articles";
import { Container } from "@/components/ui/container";

/** Sitewide breaking-news strip — shows the newest breaking story from the last 48h. */
export async function BreakingNews() {
  const article = await prisma.article.findFirst({
    where: {
      ...liveWhere(),
      isBreaking: true,
      publishedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    orderBy: { publishedAt: "desc" },
    select: { title: true, slug: true },
  });
  if (!article) return null;

  return (
    <div className="bg-destructive text-destructive-foreground">
      <Container className="flex items-center gap-2 py-1.5 text-sm">
        <span className="flex shrink-0 items-center gap-1 font-bold uppercase tracking-wide">
          <Zap className="size-3.5" />
          Breaking
        </span>
        <Link href={`/articles/${article.slug}`} className="min-w-0 truncate font-medium hover:underline">
          {article.title}
        </Link>
      </Container>
    </div>
  );
}
