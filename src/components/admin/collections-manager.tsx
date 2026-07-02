"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  deleteCollection,
  saveCollection,
  toggleArticleInCollection,
  type CollectionInput,
} from "@/lib/actions/taxonomy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/auth/form-field";
import { cn } from "@/lib/utils";

interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  featured: boolean;
  articleIds: string[];
}

interface ArticleOption {
  id: string;
  title: string;
}

export function CollectionsManager({
  collections,
  articles,
}: {
  collections: CollectionRow[];
  articles: ArticleOption[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [managingId, setManagingId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(input: CollectionInput, id?: string) {
    setPending(true);
    setError(null);
    const res = await saveCollection(input, id);
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setEditingId(null);
    setShowCreate(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Layers className="size-5 text-accent" />
          Collections
        </h1>
        <Button variant="accent" size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus />
          New collection
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Curated cross-category hubs, e.g. “AI Special Report” or “Beginner Guides”.
      </p>

      <FormError message={error} />

      {showCreate && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <CollectionForm initial={null} pending={pending} onSubmit={(i) => submit(i)} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {collections.map((c) => (
          <li key={c.id} className="rounded-lg border bg-card">
            <div className="flex items-center gap-3 px-4 py-3">
              {c.featured && <Star className="size-4 shrink-0 text-accent" aria-label="Featured" />}
              <div className="min-w-0 flex-1">
                <Link href={`/collections/${c.slug}`} className="truncate font-medium hover:text-accent">
                  {c.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">/{c.slug}</p>
              </div>
              <Badge variant="secondary">{c.articleIds.length} articles</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManagingId(managingId === c.id ? null : c.id)}
              >
                Manage articles
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${c.name}`}
                onClick={() => setEditingId(editingId === c.id ? null : c.id)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                aria-label={`Delete ${c.name}`}
                disabled={pending}
                onClick={async () => {
                  if (!window.confirm(`Delete "${c.name}"? Articles themselves are not deleted.`)) return;
                  setPending(true);
                  await deleteCollection(c.id);
                  setPending(false);
                  router.refresh();
                }}
              >
                <Trash2 />
              </Button>
            </div>

            {editingId === c.id && (
              <div className="border-t p-4">
                <CollectionForm initial={c} pending={pending} onSubmit={(i) => submit(i, c.id)} onCancel={() => setEditingId(null)} />
              </div>
            )}

            {managingId === c.id && (
              <div className="max-h-72 overflow-y-auto border-t p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Click to add or remove published articles
                </p>
                <div className="space-y-1">
                  {articles.map((a) => {
                    const inCollection = c.articleIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        disabled={pending}
                        onClick={async () => {
                          setPending(true);
                          await toggleArticleInCollection(c.id, a.id);
                          setPending(false);
                          router.refresh();
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          inCollection ? "border-accent bg-accent-soft" : "hover:border-muted-foreground/40"
                        )}
                      >
                        <span className="truncate">{a.title}</span>
                        {inCollection && <span className="shrink-0 text-xs font-medium text-accent">In collection ✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CollectionForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: CollectionRow | null;
  pending: boolean;
  onSubmit: (input: CollectionInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<CollectionInput>(
    initial
      ? {
          name: initial.name,
          slug: initial.slug,
          description: initial.description,
          coverImage: initial.coverImage,
          featured: initial.featured,
        }
      : { name: "", description: "", coverImage: "", featured: false }
  );

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Name *</label>
        <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-9" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Cover image URL</label>
        <Input value={form.coverImage ?? ""} onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))} className="h-9" placeholder="https://…" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <Input value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="h-9" />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={form.featured ?? false}
          onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
          className="size-4 accent-[var(--accent)]"
        />
        Feature on the collections page
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? <Spinner className="size-4" /> : initial ? "Save changes" : "Create collection"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
