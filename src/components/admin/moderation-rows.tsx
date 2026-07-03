"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Trash2, X } from "lucide-react";
import { deleteComment, setCommentStatus } from "@/lib/actions/comments";
import { resolveReport } from "@/lib/actions/moderation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FlaggedCommentRow({
  comment,
}: {
  comment: {
    id: string;
    content: string;
    authorName: string;
    authorEmail: string;
    articleTitle: string;
    articleSlug: string;
    createdAt: string;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    await fn();
    setPending(false);
    router.refresh();
  }

  return (
    <li className="rounded-xl border bg-card p-4">
      <p className="text-sm">“{comment.content}”</p>
      <p className="mt-1 text-xs text-muted-foreground">
        by {comment.authorName} ({comment.authorEmail}) on{" "}
        <Link href={`/articles/${comment.articleSlug}`} className="text-accent hover:underline">
          {comment.articleTitle}
        </Link>{" "}
        · {new Date(comment.createdAt).toLocaleString()}
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="accent" size="sm" disabled={pending} onClick={() => run(() => setCommentStatus(comment.id, "visible"))}>
          <Check /> Approve
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setCommentStatus(comment.id, "hidden"))}>
          <EyeOff /> Keep hidden
        </Button>
        <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => deleteComment(comment.id))}>
          <Trash2 /> Delete
        </Button>
      </div>
    </li>
  );
}

export function ReportRow({
  report,
}: {
  report: {
    id: string;
    targetType: string;
    reason: string;
    detail: string | null;
    status: string;
    reporterName: string;
    createdAt: string;
    targetLabel: string;
    targetUrl: string | null;
    commentId: string | null;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    await fn();
    setPending(false);
    router.refresh();
  }

  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">{report.targetType}</Badge>
        <Badge variant="secondary">{report.reason}</Badge>
        {report.status !== "open" && (
          <Badge variant={report.status === "resolved" ? "accent" : "outline"} className="capitalize">
            {report.status}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          by {report.reporterName} · {new Date(report.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="mt-2 text-sm">
        {report.targetUrl ? (
          <Link href={report.targetUrl} className="hover:text-accent">
            {report.targetLabel}
          </Link>
        ) : (
          report.targetLabel
        )}
      </p>
      {report.detail && <p className="mt-1 text-sm text-muted-foreground">“{report.detail}”</p>}

      {report.status === "open" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.commentId && (
            <>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => run(async () => {
                await setCommentStatus(report.commentId!, "hidden");
                await resolveReport(report.id, "resolved");
              })}>
                <EyeOff /> Hide comment & resolve
              </Button>
              <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(async () => {
                await deleteComment(report.commentId!);
                await resolveReport(report.id, "resolved");
              })}>
                <Trash2 /> Delete comment & resolve
              </Button>
            </>
          )}
          <Button variant="accent" size="sm" disabled={pending} onClick={() => run(() => resolveReport(report.id, "resolved"))}>
            <Check /> Resolve
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => resolveReport(report.id, "dismissed"))}>
            <X /> Dismiss
          </Button>
        </div>
      )}
    </li>
  );
}
