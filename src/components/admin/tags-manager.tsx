"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GitMerge, Plus, Trash2 } from "lucide-react";
import { createTag, deleteTag, mergeTags } from "@/lib/actions/taxonomy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/auth/form-field";

interface TagItem {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export function TagsManager({ tags }: { tags: TagItem[] }) {
  const router = useRouter();
  const [newTag, setNewTag] = React.useState("");
  const [mergeSource, setMergeSource] = React.useState("");
  const [mergeTarget, setMergeTarget] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run(fn: () => Promise<{ error?: string; success?: boolean } | undefined>) {
    setPending(true);
    setError(null);
    const res = await fn();
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div>
      <h1 className="text-xl font-bold">Tags</h1>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Create */}
        <form
          className="rounded-xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createTag(newTag)).then(() => setNewTag(""));
          }}
        >
          <h2 className="text-sm font-semibold">Create tag</h2>
          <div className="mt-3 flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="e.g. machine-learning"
              className="h-9"
              required
            />
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              <Plus />
              Add
            </Button>
          </div>
        </form>

        {/* Merge */}
        <form
          className="rounded-xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => mergeTags(mergeSource, mergeTarget)).then(() => {
              setMergeSource("");
              setMergeTarget("");
            });
          }}
        >
          <h2 className="text-sm font-semibold">Merge duplicates</h2>
          <div className="mt-3 flex items-center gap-2">
            <select required value={mergeSource} onChange={(e) => setMergeSource(e.target.value)} className={selectClass} aria-label="Merge from">
              <option value="">Merge this…</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <GitMerge className="size-4 shrink-0 text-muted-foreground" />
            <select required value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className={selectClass} aria-label="Merge into">
              <option value="">…into this</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              Merge
            </Button>
          </div>
        </form>
      </div>

      <FormError message={error} />

      {/* Tag cloud */}
      <div className="mt-6 flex flex-wrap gap-2">
        {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="group flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm"
          >
            #{tag.name}
            <Badge variant="secondary">{tag.count}</Badge>
            <button
              aria-label={`Delete tag ${tag.name}`}
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Delete #${tag.name}? It will be removed from ${tag.count} article(s).`)) {
                  run(() => deleteTag(tag.id));
                }
              }}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
