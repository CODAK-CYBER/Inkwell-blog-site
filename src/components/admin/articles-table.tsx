"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pin, Star } from "lucide-react";
import {
  archiveArticle,
  deleteArticleForever,
  duplicateArticle,
  publishArticle,
  requestChanges,
  restoreArticle,
  toggleFeatured,
  togglePinned,
  trashArticle,
  unpublishArticle,
} from "@/lib/actions/articles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  featured: boolean;
  pinned: boolean;
  views: number;
  author: string;
  category: string;
  updatedAt: string;
}

const STATUS_VARIANT: Record<string, "accent" | "secondary" | "outline"> = {
  published: "accent",
  scheduled: "accent",
  pending: "secondary",
  draft: "outline",
  archived: "outline",
  trashed: "outline",
};

export function ArticlesTable({ rows }: { rows: ArticleRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setOpenMenu(null);
    try {
      await fn();
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  async function bulk(action: (id: string) => Promise<unknown>) {
    setPending(true);
    for (const id of selected) {
      await action(id);
    }
    setSelected(new Set());
    setPending(false);
    router.refresh();
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = rows.length > 0 && selected.size === rows.length;

  return (
    <div className="mt-4">
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => bulk(publishArticle)}>
            Publish
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => bulk(archiveArticle)}>
            Archive
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => bulk(trashArticle)}>
            Trash
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
                  }
                  aria-label="Select all"
                  className="size-4 accent-[var(--accent)]"
                />
              </th>
              <th className="px-3 py-3 font-medium">Title</th>
              <th className="px-3 py-3 font-medium">Author</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Views</th>
              <th className="px-3 py-3 font-medium">Updated</th>
              <th className="px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  No articles match this filter.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className={cn(row.status === "trashed" && "opacity-60")}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    aria-label={`Select ${row.title}`}
                    className="size-4 accent-[var(--accent)]"
                  />
                </td>
                <td className="max-w-64 px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    {row.pinned && <Pin className="size-3.5 shrink-0 text-accent" aria-label="Pinned" />}
                    {row.featured && <Star className="size-3.5 shrink-0 text-accent" aria-label="Featured" />}
                    <Link href={`/write/${row.id}`} className="truncate font-medium hover:text-accent">
                      {row.title}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{row.author}</td>
                <td className="px-3 py-3 text-muted-foreground">{row.category}</td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "outline"} className="capitalize">
                    {row.status}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{row.views.toLocaleString()}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {new Date(row.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-3">
                  <div className="relative" ref={openMenu === row.id ? menuRef : undefined}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      aria-label={`Actions for ${row.title}`}
                      onClick={() => setOpenMenu(openMenu === row.id ? null : row.id)}
                    >
                      <MoreHorizontal />
                    </Button>
                    {openMenu === row.id && (
                      <div className="absolute right-0 top-8 z-20 w-52 rounded-lg border bg-popover p-1 text-sm shadow-lg">
                        <MenuLink href={`/articles/${row.slug}`}>Preview</MenuLink>
                        <MenuLink href={`/write/${row.id}`}>Edit</MenuLink>
                        {row.status === "pending" && (
                          <>
                            <MenuButton onClick={() => run(() => publishArticle(row.id))}>
                              Approve & publish
                            </MenuButton>
                            <MenuButton onClick={() => run(() => requestChanges(row.id))}>
                              Request changes
                            </MenuButton>
                          </>
                        )}
                        {(row.status === "draft" || row.status === "archived") && (
                          <MenuButton onClick={() => run(() => publishArticle(row.id))}>
                            Publish
                          </MenuButton>
                        )}
                        {(row.status === "published" || row.status === "scheduled") && (
                          <MenuButton onClick={() => run(() => unpublishArticle(row.id))}>
                            Unpublish
                          </MenuButton>
                        )}
                        <MenuButton onClick={() => run(() => toggleFeatured(row.id))}>
                          {row.featured ? "Unfeature" : "Feature"}
                        </MenuButton>
                        <MenuButton onClick={() => run(() => togglePinned(row.id))}>
                          {row.pinned ? "Unpin" : "Pin"}
                        </MenuButton>
                        <MenuButton onClick={() => run(() => duplicateArticle(row.id))}>
                          Duplicate
                        </MenuButton>
                        {row.status !== "archived" && row.status !== "trashed" && (
                          <MenuButton onClick={() => run(() => archiveArticle(row.id))}>
                            Archive
                          </MenuButton>
                        )}
                        {row.status === "trashed" ? (
                          <>
                            <MenuButton onClick={() => run(() => restoreArticle(row.id))}>
                              Restore
                            </MenuButton>
                            <MenuButton
                              destructive
                              onClick={() => {
                                if (window.confirm("Delete this article forever? This cannot be undone.")) {
                                  run(() => deleteArticleForever(row.id));
                                }
                              }}
                            >
                              Delete forever
                            </MenuButton>
                          </>
                        ) : (
                          <MenuButton destructive onClick={() => run(() => trashArticle(row.id))}>
                            Move to trash
                          </MenuButton>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-md px-3 py-1.5 text-left hover:bg-secondary",
        destructive && "text-destructive hover:bg-destructive/10"
      )}
    >
      {children}
    </button>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex w-full items-center rounded-md px-3 py-1.5 hover:bg-secondary">
      {children}
    </Link>
  );
}
