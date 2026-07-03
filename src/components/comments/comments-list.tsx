"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Flag,
  Heart,
  MessageSquare,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import {
  addComment,
  deleteComment,
  editComment,
  reportTarget,
  setCommentStatus,
  toggleCommentReaction,
  togglePinComment,
} from "@/lib/actions/comments";
import { REPORT_REASONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormError, FormSuccess } from "@/components/auth/form-field";
import { cn, formatDate } from "@/lib/utils";

export interface CommentNode {
  id: string;
  content: string;
  status: string;
  pinned: boolean;
  isOfficial: boolean;
  editedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
    role: string;
    verified: boolean;
  };
  likeCount: number;
  likedByMe: boolean;
  replies: CommentNode[];
}

interface Viewer {
  id: string;
  name: string;
  canModerate: boolean;
}

type SortMode = "newest" | "oldest" | "top";

/** Render @mentions as profile links; everything else as plain text. */
function CommentBody({ content }: { content: string }) {
  const parts = content.split(/(@[a-z0-9_.-]{3,30})/gi);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <Link key={i} href={`/u/${part.slice(1)}`} className="font-medium text-accent hover:underline">
            {part}
          </Link>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </p>
  );
}

export function CommentsList({
  articleId,
  initialComments,
  viewer,
}: {
  articleId: string;
  initialComments: CommentNode[];
  viewer: Viewer | null;
}) {
  const router = useRouter();
  const [sort, setSort] = React.useState<SortMode>("newest");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const total = countAll(initialComments);

  const sorted = React.useMemo(() => {
    const copy = [...initialComments];
    const cmp = (a: CommentNode, b: CommentNode) =>
      sort === "top"
        ? b.likeCount - a.likeCount
        : sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt);
    copy.sort((a, b) => Number(b.pinned) - Number(a.pinned) || cmp(a, b));
    return copy;
  }, [initialComments, sort]);

  return (
    <section id="comments" className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquare className="size-6 text-accent" />
          Discussion ({total})
        </h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort comments"
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="top">Most liked</option>
        </select>
      </div>

      <div className="mt-4 space-y-2">
        <FormError message={error} />
        <FormSuccess message={notice} />
      </div>

      {viewer ? (
        <CommentForm
          articleId={articleId}
          onDone={(msg) => {
            setNotice(msg ?? null);
            setError(null);
            router.refresh();
          }}
          onError={setError}
        />
      ) : (
        <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      <div className="mt-6 space-y-5">
        {sorted.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            articleId={articleId}
            viewer={viewer}
            depth={0}
            onChanged={(msg) => {
              setNotice(msg ?? null);
              router.refresh();
            }}
            onError={setError}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Be the first to share your thoughts.</p>
        )}
      </div>
    </section>
  );
}

function countAll(nodes: CommentNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countAll(n.replies), 0);
}

function CommentForm({
  articleId,
  parentId,
  onDone,
  onError,
  autoFocus,
}: {
  articleId: string;
  parentId?: string;
  onDone: (notice?: string) => void;
  onError: (msg: string) => void;
  autoFocus?: boolean;
}) {
  const [content, setContent] = React.useState("");
  const [pending, setPending] = React.useState(false);

  return (
    <form
      className="mt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const res = await addComment(articleId, content, parentId);
        setPending(false);
        if ("error" in res && res.error) {
          onError(res.error);
          return;
        }
        setContent("");
        onDone("notice" in res ? res.notice : undefined);
      }}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus={autoFocus}
        placeholder={parentId ? "Write a reply… (@username to mention)" : "Share your thoughts… (@username to mention)"}
        rows={parentId ? 2 : 3}
        maxLength={3000}
        required
        className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length}/3000</span>
        <Button type="submit" variant="accent" size="sm" disabled={pending || !content.trim()}>
          {pending ? <Spinner className="size-4" /> : parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  articleId,
  viewer,
  depth,
  onChanged,
  onError,
}: {
  comment: CommentNode;
  articleId: string;
  viewer: Viewer | null;
  depth: number;
  onChanged: (notice?: string) => void;
  onError: (msg: string) => void;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [replying, setReplying] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(comment.content);
  const [liked, setLiked] = React.useState(comment.likedByMe);
  const [likeCount, setLikeCount] = React.useState(comment.likeCount);
  const [reporting, setReporting] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const isOwn = viewer?.id === comment.author.id;
  const staffBadge =
    comment.author.role === "superadmin" || comment.author.role === "admin"
      ? "Staff"
      : comment.author.role === "editor"
        ? "Editor"
        : comment.author.role === "moderator"
          ? "Moderator"
          : null;

  async function act(fn: () => Promise<{ error?: string; notice?: string } | unknown>, msg?: string) {
    setPending(true);
    const res = (await fn()) as { error?: string; notice?: string } | undefined;
    setPending(false);
    if (res?.error) {
      onError(res.error);
      return;
    }
    onChanged(res?.notice ?? msg);
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        depth > 0 && "border-l-2 border-l-accent/40",
        comment.status !== "visible" && "border-dashed opacity-70"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href={`/u/${comment.author.username ?? comment.author.id}`}
          className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold"
        >
          {comment.author.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comment.author.image} alt="" className="size-full object-cover" />
          ) : (
            comment.author.name.charAt(0)
          )}
        </Link>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
            {comment.author.name}
            {comment.author.verified && (
              <BadgeCheck className="size-4 text-accent" aria-label="Verified" />
            )}
            {comment.isOfficial && staffBadge && <Badge variant="accent">{staffBadge}</Badge>}
            {comment.pinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="size-3" /> Pinned
              </Badge>
            )}
            {comment.status === "flagged" && <Badge variant="outline">Held for review</Badge>}
            {comment.status === "hidden" && <Badge variant="outline">Hidden</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(comment.createdAt)}
            {comment.editedAt && " · edited"}
          </p>
        </div>
        {comment.replies.length > 0 && (
          <button
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            {comment.replies.length} repl{comment.replies.length === 1 ? "y" : "ies"}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="mt-2">
        {editing ? (
          <div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <Button
                variant="accent"
                size="sm"
                disabled={pending}
                onClick={() => act(() => editComment(comment.id, editText)).then(() => setEditing(false))}
              >
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <CommentBody content={comment.content} />
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
          <Button
            variant="ghost"
            size="sm"
            disabled={!viewer || pending}
            aria-pressed={liked}
            className={cn("h-7 px-2", liked && "text-accent")}
            onClick={async () => {
              if (!viewer) return;
              setLiked((v) => !v);
              setLikeCount((c) => c + (liked ? -1 : 1));
              const res = await toggleCommentReaction(comment.id);
              if (res && "count" in res) {
                setLiked(res.liked);
                setLikeCount(res.count);
              }
            }}
          >
            <Heart className={cn("size-3.5", liked && "fill-current")} />
            {likeCount > 0 ? likeCount : ""}
          </Button>
          {viewer && depth < 5 && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setReplying((v) => !v)}>
              Reply
            </Button>
          )}
          {isOwn && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
          {(isOwn || viewer?.canModerate) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Delete this comment (and its replies)?")) {
                  act(() => deleteComment(comment.id));
                }
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
          {viewer?.canModerate && (
            <>
              <Button variant="ghost" size="sm" className="h-7 px-2" disabled={pending} onClick={() => act(() => togglePinComment(comment.id))}>
                <Pin className="size-3.5" />
                {comment.pinned ? "Unpin" : "Pin"}
              </Button>
              {comment.status !== "visible" ? (
                <Button variant="ghost" size="sm" className="h-7 px-2" disabled={pending} onClick={() => act(() => setCommentStatus(comment.id, "visible"), "Comment approved.")}>
                  Approve
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 px-2" disabled={pending} onClick={() => act(() => setCommentStatus(comment.id, "hidden"), "Comment hidden.")}>
                  Hide
                </Button>
              )}
            </>
          )}
          {viewer && !isOwn && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setReporting((v) => !v)}>
              <Flag className="size-3.5" />
              Report
            </Button>
          )}
        </div>
      )}

      {reporting && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              disabled={pending}
              onClick={() =>
                act(() => reportTarget("comment", comment.id, reason)).then(() => setReporting(false))
              }
              className="rounded-full border px-2.5 py-1 text-xs hover:border-accent"
            >
              {reason}
            </button>
          ))}
        </div>
      )}

      {replying && viewer && (
        <CommentForm
          articleId={articleId}
          parentId={comment.id}
          autoFocus
          onDone={(msg) => {
            setReplying(false);
            onChanged(msg);
          }}
          onError={onError}
        />
      )}

      {/* Replies */}
      {!collapsed && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3 pl-4 sm:pl-6">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              viewer={viewer}
              depth={depth + 1}
              onChanged={onChanged}
              onError={onError}
            />
          ))}
        </div>
      )}
    </div>
  );
}
