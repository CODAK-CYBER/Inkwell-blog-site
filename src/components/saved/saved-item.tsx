"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, FolderInput, MoreHorizontal, Trash2 } from "lucide-react";
import {
  moveBookmarkToList,
  removeBookmark,
  toggleArchiveBookmark,
} from "@/lib/actions/engagement";
import type { Article } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BookmarkInfo {
  id: string;
  archived: boolean;
  listId: string | null;
  createdAt: string;
}

export function SavedItem({
  bookmark,
  article,
  lists,
}: {
  bookmark: BookmarkInfo;
  article: Article;
  lists: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [moving, setMoving] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMoving(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setOpen(false);
    setMoving(false);
    try {
      await fn();
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  return (
    <li className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="accent">{article.category.name}</Badge>
          <span className="text-xs text-muted-foreground">
            saved {new Date(bookmark.createdAt).toLocaleDateString()}
          </span>
        </div>
        <Link
          href={`/articles/${article.slug}`}
          className="mt-1.5 block truncate font-serif font-semibold hover:text-accent"
        >
          {article.title}
        </Link>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{article.excerpt}</p>
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={`Options for ${article.title}`}
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal />
        </Button>
        {open && (
          <div className="absolute right-0 top-9 z-20 w-52 rounded-lg border bg-popover p-1 text-sm shadow-lg">
            {moving ? (
              <>
                <button
                  className="flex w-full items-center rounded-md px-3 py-1.5 hover:bg-secondary"
                  onClick={() => run(() => moveBookmarkToList(bookmark.id, null))}
                >
                  No list
                </button>
                {lists.map((list) => (
                  <button
                    key={list.id}
                    className="flex w-full items-center rounded-md px-3 py-1.5 hover:bg-secondary"
                    onClick={() => run(() => moveBookmarkToList(bookmark.id, list.id))}
                  >
                    {list.name} {bookmark.listId === list.id && "✓"}
                  </button>
                ))}
              </>
            ) : (
              <>
                {lists.length > 0 && (
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 hover:bg-secondary"
                    onClick={() => setMoving(true)}
                  >
                    <FolderInput className="size-4" />
                    Move to list…
                  </button>
                )}
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 hover:bg-secondary"
                  onClick={() => run(() => toggleArchiveBookmark(bookmark.id))}
                >
                  {bookmark.archived ? (
                    <>
                      <ArchiveRestore className="size-4" /> Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" /> Archive
                    </>
                  )}
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => run(() => removeBookmark(bookmark.id))}
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
