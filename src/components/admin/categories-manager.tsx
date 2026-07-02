"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory, type CategoryInput } from "@/lib/actions/taxonomy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/auth/form-field";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  parentId: string | null;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  articleCount: number;
}

const empty: CategoryInput = {
  name: "",
  description: "",
  icon: "",
  image: "",
  parentId: "",
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
};

export function CategoriesManager({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const parents = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  async function submit(input: CategoryInput, id?: string) {
    setPending(true);
    setError(null);
    const res = await saveCategory(input, id);
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return false;
    }
    setEditingId(null);
    setShowCreate(false);
    router.refresh();
    return true;
  }

  async function remove(cat: CategoryItem) {
    if (
      !window.confirm(
        `Delete "${cat.name}"? Its ${cat.articleCount} article(s) will become uncategorized; subcategories become top-level.`
      )
    ) {
      return;
    }
    setPending(true);
    await deleteCategory(cat.id);
    setPending(false);
    router.refresh();
  }

  const Row = ({ cat, child }: { cat: CategoryItem; child?: boolean }) => (
    <li className="rounded-lg border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        {child && <CornerDownRight className="size-4 shrink-0 text-muted-foreground" />}
        <span className="text-lg">{cat.icon || "📁"}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{cat.name}</p>
          <p className="truncate text-xs text-muted-foreground">/{cat.slug}</p>
        </div>
        <Badge variant="secondary">{cat.articleCount} articles</Badge>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${cat.name}`}
          onClick={() => {
            setEditingId(editingId === cat.id ? null : cat.id);
            setShowCreate(false);
          }}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${cat.name}`}
          disabled={pending}
          onClick={() => remove(cat)}
          className="text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
      {editingId === cat.id && (
        <div className="border-t p-4">
          <CategoryForm
            initial={cat}
            parents={parents.filter((p) => p.id !== cat.id)}
            pending={pending}
            onSubmit={(input) => submit(input, cat.id)}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}
    </li>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Categories</h1>
        <Button
          variant="accent"
          size="sm"
          onClick={() => {
            setShowCreate((v) => !v);
            setEditingId(null);
          }}
        >
          <Plus />
          New category
        </Button>
      </div>

      <FormError message={error} />

      {showCreate && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <CategoryForm
            initial={null}
            parents={parents}
            pending={pending}
            onSubmit={(input) => submit(input)}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {parents.map((parent) => (
          <React.Fragment key={parent.id}>
            <Row cat={parent} />
            {childrenOf(parent.id).map((child) => (
              <Row key={child.id} cat={child} child />
            ))}
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
}

function CategoryForm({
  initial,
  parents,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: CategoryItem | null;
  parents: CategoryItem[];
  pending: boolean;
  onSubmit: (input: CategoryInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<CategoryInput>(
    initial
      ? {
          name: initial.name,
          slug: initial.slug,
          description: initial.description,
          icon: initial.icon,
          image: initial.image,
          parentId: initial.parentId ?? "",
          sortOrder: initial.sortOrder,
          seoTitle: initial.seoTitle,
          seoDescription: initial.seoDescription,
        }
      : empty
  );

  const set = (key: keyof CategoryInput, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

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
        <Input required value={form.name} onChange={(e) => set("name", e.target.value)} className="h-9" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Icon (emoji)</label>
        <Input value={form.icon ?? ""} onChange={(e) => set("icon", e.target.value)} placeholder="💻" className="h-9" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} className="h-9" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Parent category</label>
        <select
          value={form.parentId ?? ""}
          onChange={(e) => set("parentId", e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">— Top level —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Sort order</label>
        <Input
          type="number"
          value={form.sortOrder ?? 0}
          onChange={(e) => set("sortOrder", Number(e.target.value))}
          className="h-9"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Image URL</label>
        <Input value={form.image ?? ""} onChange={(e) => set("image", e.target.value)} placeholder="https://…" className="h-9" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">SEO title</label>
        <Input value={form.seoTitle ?? ""} onChange={(e) => set("seoTitle", e.target.value)} className="h-9" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground">SEO description</label>
        <Input value={form.seoDescription ?? ""} onChange={(e) => set("seoDescription", e.target.value)} className="h-9" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? <Spinner className="size-4" /> : initial ? "Save changes" : "Create category"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
