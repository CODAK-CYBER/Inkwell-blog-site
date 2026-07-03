import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { articleInclude, liveWhere, toCardModel } from "@/lib/articles";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/articles/article-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Archive",
  description: "Every article we've published, organized by date.",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function ArchivePage({ searchParams }: Props) {
  const params = await searchParams;
  const year = Number(params.year) || null;
  const month = Number(params.month) || null;

  const all = await prisma.article.findMany({
    where: liveWhere(),
    include: articleInclude,
    orderBy: { publishedAt: "desc" },
  });

  // Group counts by year → month
  const tree = new Map<number, Map<number, number>>();
  for (const a of all) {
    const d = a.publishedAt ?? a.createdAt;
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!tree.has(y)) tree.set(y, new Map());
    const months = tree.get(y)!;
    months.set(m, (months.get(m) ?? 0) + 1);
  }

  const filtered = all.filter((a) => {
    const d = a.publishedAt ?? a.createdAt;
    if (year && d.getFullYear() !== year) return false;
    if (month && d.getMonth() !== month - 1) return false;
    return true;
  });

  return (
    <Container className="py-14">
      <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
        <CalendarDays className="size-7 text-accent" />
        Archive
      </h1>
      <p className="mt-2 text-muted-foreground">
        {all.length} article{all.length === 1 ? "" : "s"} and counting.
      </p>

      {/* Year / month tree */}
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/archive"
          className={cn(
            "rounded-full border px-3 py-1 transition-colors",
            !year ? "border-accent bg-accent-soft" : "hover:border-accent"
          )}
        >
          All time
        </Link>
        {[...tree.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([y, months]) => (
            <span key={y} className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/archive?year=${y}`}
                className={cn(
                  "rounded-full border px-3 py-1 font-medium transition-colors",
                  year === y && !month ? "border-accent bg-accent-soft" : "hover:border-accent"
                )}
              >
                {y}
              </Link>
              {year === y &&
                [...months.entries()]
                  .sort((a, b) => b[0] - a[0])
                  .map(([m, count]) => (
                    <Link
                      key={m}
                      href={`/archive?year=${y}&month=${m + 1}`}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        month === m + 1 ? "border-accent bg-accent-soft" : "hover:border-accent"
                      )}
                    >
                      {MONTHS[m]} ({count})
                    </Link>
                  ))}
            </span>
          ))}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <ArticleCard key={a.id} article={toCardModel(a)} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Nothing published in this period.
        </p>
      )}
    </Container>
  );
}
