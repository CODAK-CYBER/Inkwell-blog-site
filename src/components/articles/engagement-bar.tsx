"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Flag, Share2 } from "lucide-react";
import { recordReading, toggleBookmark, toggleLike } from "@/lib/actions/engagement";
import { reportTarget } from "@/lib/actions/comments";
import { REACTIONS, REPORT_REASONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  articleId: string;
  title: string;
  signedIn: boolean;
  initialReaction: string | null;
  initialBookmarked: boolean;
  initialLikeCount: number;
}

const SHARE_TARGETS = [
  { label: "WhatsApp", href: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}` },
  { label: "X", href: (u: string, t: string) => `https://x.com/intent/tweet?url=${u}&text=${t}` },
  { label: "Facebook", href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { label: "LinkedIn", href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  { label: "Telegram", href: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}` },
  { label: "Email", href: (u: string, t: string) => `mailto:?subject=${t}&body=${u}` },
];

export function EngagementBar({
  slug,
  articleId,
  title,
  signedIn,
  initialReaction,
  initialBookmarked,
  initialLikeCount,
}: Props) {
  const router = useRouter();
  const [reaction, setReaction] = React.useState<string | null>(initialReaction);
  const [bookmarked, setBookmarked] = React.useState(initialBookmarked);
  const [likeCount, setLikeCount] = React.useState(initialLikeCount);
  const [showReactions, setShowReactions] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (signedIn) recordReading(slug).catch(() => {});
  }, [signedIn, slug]);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setShowReactions(false);
        setShowShare(false);
        setShowReport(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const gate = () => router.push(`/login?next=/articles/${slug}`);

  async function react(type: string) {
    if (!signedIn) return gate();
    setShowReactions(false);
    const prev = reaction;
    setReaction(prev === type ? null : type);
    setLikeCount((c) => c + (prev === type ? -1 : prev ? 0 : 1));
    try {
      const res = await toggleLike(slug, type);
      setReaction(res.reaction);
      setLikeCount(res.count);
    } catch {
      setReaction(prev);
    }
  }

  async function onBookmark() {
    if (!signedIn) return gate();
    setBookmarked((v) => !v);
    try {
      const res = await toggleBookmark(slug);
      setBookmarked(res.bookmarked);
    } catch {
      setBookmarked(bookmarked);
    }
  }

  const current = REACTIONS.find((r) => r.type === reaction);

  return (
    <div ref={barRef} className="relative">
      <div className="flex flex-wrap items-center gap-1">
        {/* Reaction picker */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            aria-haspopup="true"
            aria-expanded={showReactions}
            className={cn(reaction && "text-accent")}
            onClick={() => setShowReactions((v) => !v)}
          >
            <span className="text-base leading-none">{current?.emoji ?? "👍"}</span>
            {likeCount > 0 ? likeCount : "React"}
          </Button>
          {showReactions && (
            <div className="absolute bottom-10 left-0 z-20 flex gap-1 rounded-full border bg-popover p-1.5 shadow-lg">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  aria-label={r.label}
                  title={r.label}
                  onClick={() => react(r.type)}
                  className={cn(
                    "rounded-full p-1.5 text-xl leading-none transition-transform hover:scale-125",
                    reaction === r.type && "bg-accent-soft"
                  )}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onBookmark}
          aria-pressed={bookmarked}
          className={cn(bookmarked && "text-accent")}
        >
          <Bookmark className={cn(bookmarked && "fill-current")} />
          {bookmarked ? "Saved" : "Save"}
        </Button>

        {/* Share */}
        <div className="relative">
          <Button variant="ghost" size="sm" aria-haspopup="true" aria-expanded={showShare} onClick={() => setShowShare((v) => !v)}>
            <Share2 />
            {copied ? "Copied!" : "Share"}
          </Button>
          {showShare && (
            <div className="absolute bottom-10 left-0 z-20 w-44 rounded-lg border bg-popover p-1 shadow-lg">
              {SHARE_TARGETS.map((target) => (
                <a
                  key={target.label}
                  href={target.href(encodeURIComponent(window.location.href), encodeURIComponent(title))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md px-3 py-1.5 text-sm hover:bg-secondary"
                  onClick={() => setShowShare(false)}
                >
                  {target.label}
                </a>
              ))}
              <button
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setShowShare(false);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                Copy link
              </button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-secondary"
                  onClick={() => {
                    navigator.share({ title, url: window.location.href }).catch(() => {});
                    setShowShare(false);
                  }}
                >
                  More…
                </button>
              )}
            </div>
          )}
        </div>

        {/* Report */}
        <div className="relative">
          <Button variant="ghost" size="sm" aria-haspopup="true" aria-expanded={showReport} onClick={() => (signedIn ? setShowReport((v) => !v) : gate())}>
            <Flag />
            Report
          </Button>
          {showReport && (
            <div className="absolute bottom-10 left-0 z-20 w-52 rounded-lg border bg-popover p-1 shadow-lg">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-secondary"
                  onClick={async () => {
                    setShowReport(false);
                    const res = await reportTarget("article", articleId, reason);
                    setNotice("notice" in res && res.notice ? res.notice : res.error ?? null);
                    setTimeout(() => setNotice(null), 4000);
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {notice && <p className="mt-1 text-xs text-muted-foreground">{notice}</p>}
    </div>
  );
}
