import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { ReportRow, FlaggedCommentRow } from "@/components/admin/moderation-rows";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Moderation — admin",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ view?: string }>;
}

export default async function ModerationPage({ searchParams }: Props) {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { comment: ["moderate"] })) redirect("/admin");
  const { view = "open" } = await searchParams;

  const [reports, flagged, counts] = await Promise.all([
    prisma.report.findMany({
      where: view === "open" ? { status: "open" } : { status: { in: ["resolved", "dismissed"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reporter: { select: { name: true } } },
    }),
    prisma.comment.findMany({
      where: { status: "flagged" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
        article: { select: { title: true, slug: true } },
      },
    }),
    prisma.report.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  // Resolve report targets for display
  const targets = await Promise.all(
    reports.map(async (r) => {
      if (r.targetType === "comment") {
        const c = await prisma.comment.findUnique({
          where: { id: r.targetId },
          include: { article: { select: { slug: true, title: true } }, user: { select: { name: true } } },
        });
        return c
          ? { label: `Comment by ${c.user.name}: “${c.content.slice(0, 80)}”`, url: `/articles/${c.article.slug}#comments`, commentId: c.id, commentStatus: c.status }
          : { label: "Comment (deleted)", url: null };
      }
      if (r.targetType === "article") {
        const a = await prisma.article.findUnique({ where: { id: r.targetId }, select: { title: true, slug: true } });
        return a ? { label: `Article: “${a.title}”`, url: `/articles/${a.slug}` } : { label: "Article (deleted)", url: null };
      }
      const u = await prisma.user.findUnique({ where: { id: r.targetId }, select: { name: true, username: true } });
      return u ? { label: `User: ${u.name}`, url: `/u/${u.username ?? r.targetId}` } : { label: "User (deleted)", url: null };
    })
  );

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <ShieldAlert className="size-5 text-accent" />
        Moderation
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Reports and comments held by the word filter.
      </p>

      {/* Flagged comments */}
      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold">
          Held for review ({flagged.length})
        </h2>
        {flagged.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No comments waiting. 🎉</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {flagged.map((c) => (
              <FlaggedCommentRow
                key={c.id}
                comment={{
                  id: c.id,
                  content: c.content,
                  authorName: c.user.name,
                  authorEmail: c.user.email,
                  articleTitle: c.article.title,
                  articleSlug: c.article.slug,
                  createdAt: c.createdAt.toISOString(),
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Reports */}
      <section className="mt-8">
        <div className="flex items-center gap-1 border-b">
          {(
            [
              ["open", `Open (${countFor("open")})`],
              ["closed", `Closed (${countFor("resolved") + countFor("dismissed")})`],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={`/admin/moderation?view=${value}`}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                view === value
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        {reports.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {view === "open" ? "No open reports. 🎉" : "No closed reports yet."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {reports.map((r, i) => (
              <ReportRow
                key={r.id}
                report={{
                  id: r.id,
                  targetType: r.targetType,
                  reason: r.reason,
                  detail: r.detail,
                  status: r.status,
                  reporterName: r.reporter.name,
                  createdAt: r.createdAt.toISOString(),
                  targetLabel: targets[i].label,
                  targetUrl: targets[i].url,
                  commentId: "commentId" in targets[i] ? (targets[i] as { commentId?: string }).commentId ?? null : null,
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
