"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Heart, Share2 } from "lucide-react";
import { recordReading, toggleBookmark, toggleLike } from "@/lib/actions/engagement";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  title: string;
  signedIn: boolean;
  initialLiked: boolean;
  initialBookmarked: boolean;
  initialLikeCount: number;
}

export function EngagementBar({
  slug,
  title,
  signedIn,
  initialLiked,
  initialBookmarked,
  initialLikeCount,
}: Props) {
  const router = useRouter();
  const [liked, setLiked] = React.useState(initialLiked);
  const [bookmarked, setBookmarked] = React.useState(initialBookmarked);
  const [likeCount, setLikeCount] = React.useState(initialLikeCount);
  const [shared, setShared] = React.useState(false);

  // Record the visit in reading history once per page view.
  React.useEffect(() => {
    if (signedIn) recordReading(slug).catch(() => {});
  }, [signedIn, slug]);

  function gate() {
    router.push(`/login?next=/articles/${slug}`);
  }

  async function onLike() {
    if (!signedIn) return gate();
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    try {
      const res = await toggleLike(slug);
      setLiked(res.liked);
      setLikeCount(res.count);
    } catch {
      setLiked(liked);
      setLikeCount(likeCount);
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

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onLike}
        aria-pressed={liked}
        aria-label={liked ? "Unlike article" : "Like article"}
        className={cn(liked && "text-accent")}
      >
        <Heart className={cn(liked && "fill-current")} />
        {likeCount > 0 ? likeCount : "Like"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onBookmark}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark article"}
        className={cn(bookmarked && "text-accent")}
      >
        <Bookmark className={cn(bookmarked && "fill-current")} />
        {bookmarked ? "Saved" : "Save"}
      </Button>
      <Button variant="ghost" size="sm" onClick={onShare} aria-label="Share article">
        <Share2 />
        {shared ? "Copied!" : "Share"}
      </Button>
    </div>
  );
}
