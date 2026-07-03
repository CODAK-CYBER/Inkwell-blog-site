"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  FileText,
  FolderPlus,
  Music,
  Star,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import {
  createMediaFolder,
  deleteMediaFolder,
  deleteMediaForever,
  moveMediaToFolder,
  restoreMedia,
  toggleFavoriteMedia,
  trashMedia,
  updateMediaMeta,
} from "@/lib/actions/media";
import { formatBytes } from "@/lib/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormError, FormSuccess } from "@/components/auth/form-field";
import { cn } from "@/lib/utils";

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  kind: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string;
  credit: string;
  tags: string;
  favorite: boolean;
  folderId: string | null;
  deleted: boolean;
  usageCount: number;
  createdAt: string;
}

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  audio: Music,
  document: FileText,
};

export function MediaLibrary({
  items,
  folders,
  activeKind,
  activeFolder,
  activeView,
  query,
}: {
  items: MediaItem[];
  folders: Array<{ id: string; name: string; count: number }>;
  activeKind: string;
  activeFolder: string;
  activeView: string;
  query: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [detail, setDetail] = React.useState<MediaItem | null>(null);
  const [pending, setPending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filterHref = (params: Record<string, string>) => {
    const merged = { kind: activeKind, folder: activeFolder, view: activeView, q: query, ...params };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `/admin/media${qs ? `?${qs}` : ""}`;
  };

  async function upload(files: FileList | File[]) {
    if (!files.length) return;
    setPending(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    for (const f of files) form.append("files", f);
    if (activeFolder) form.append("folderId", activeFolder);
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
      } else {
        const ok = data.results.filter((r: { id: string; error?: string }) => r.id && !r.error).length;
        const dupes = data.results.filter((r: { duplicate?: boolean }) => r.duplicate).length;
        const failed = data.results.filter((r: { error?: string }) => r.error);
        setNotice(
          `${ok} file${ok === 1 ? "" : "s"} ready${dupes ? ` (${dupes} already existed)` : ""}.`
        );
        if (failed.length) {
          setError(failed.map((f: { filename: string; error: string }) => `${f.filename}: ${f.error}`).join(" · "));
        }
      }
    } catch {
      setError("Upload failed — check your connection.");
    }
    setPending(false);
    router.refresh();
  }

  async function run(fn: () => Promise<{ error?: string } | unknown>) {
    setPending(true);
    setError(null);
    setNotice(null);
    const res = (await fn()) as { error?: string } | undefined;
    if (res?.error) setError(res.error);
    setPending(false);
    setSelected(new Set());
    setDetail(null);
    router.refresh();
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        upload(e.dataTransfer.files);
      }}
    >
      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="accent" size="sm" disabled={pending} onClick={() => fileInputRef.current?.click()}>
          {pending ? <Spinner className="size-4" /> : <UploadCloud />}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const name = window.prompt("Folder name:");
            if (name) await run(() => createMediaFolder(name));
          }}
        >
          <FolderPlus />
          New folder
        </Button>
        <form action="/admin/media" method="GET" className="ml-auto flex gap-2">
          {activeKind && <input type="hidden" name="kind" value={activeKind} />}
          {activeView && <input type="hidden" name="view" value={activeView} />}
          <Input name="q" defaultValue={query} placeholder="Search files…" className="h-8 w-48 text-sm" />
        </form>
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
        {[
          ["", "All"],
          ["image", "Images"],
          ["video", "Videos"],
          ["audio", "Audio"],
          ["document", "Documents"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={filterHref({ kind: value, view: "" })}
            className={cn(
              "rounded-full border px-3 py-1 transition-colors",
              activeKind === value && !activeView ? "border-accent bg-accent-soft" : "hover:border-accent"
            )}
          >
            {label}
          </Link>
        ))}
        <span className="mx-1 text-muted-foreground">·</span>
        <Link
          href={filterHref({ view: "favorites", kind: "" })}
          className={cn(
            "rounded-full border px-3 py-1 transition-colors",
            activeView === "favorites" ? "border-accent bg-accent-soft" : "hover:border-accent"
          )}
        >
          ★ Favorites
        </Link>
        <Link
          href={filterHref({ view: "trash", kind: "" })}
          className={cn(
            "rounded-full border px-3 py-1 transition-colors",
            activeView === "trash" ? "border-accent bg-accent-soft" : "hover:border-accent"
          )}
        >
          Trash
        </Link>
        {folders.map((f) => (
          <Link
            key={f.id}
            href={filterHref({ folder: activeFolder === f.id ? "" : f.id, view: "" })}
            className={cn(
              "rounded-full border px-3 py-1 transition-colors",
              activeFolder === f.id ? "border-accent bg-accent-soft" : "hover:border-accent"
            )}
          >
            📁 {f.name} <span className="text-xs text-muted-foreground">({f.count})</span>
          </Link>
        ))}
        {activeFolder && (
          <button
            className="text-xs text-destructive hover:underline"
            onClick={() => {
              if (window.confirm("Delete this folder? Files inside are kept.")) {
                run(() => deleteMediaFolder(activeFolder)).then(() => router.push("/admin/media"));
              }
            }}
          >
            Delete folder
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <FormError message={error} />
        <FormSuccess message={notice} />
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          {activeView === "trash" ? (
            <>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => restoreMedia([...selected]))}>
                <ArchiveRestore /> Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Delete these files forever? This cannot be undone.")) {
                    run(() => deleteMediaForever([...selected]));
                  }
                }}
              >
                <Trash2 /> Delete forever
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => trashMedia([...selected]))}>
                <Archive /> Trash
              </Button>
              {folders.length > 0 && (
                <select
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value === "") return;
                    run(() =>
                      moveMediaToFolder([...selected], e.target.value === "none" ? null : e.target.value)
                    );
                  }}
                >
                  <option value="" disabled>
                    Move to folder…
                  </option>
                  <option value="none">No folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Grid */}
      <div
        className={cn(
          "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
          dragOver && "rounded-xl outline-dashed outline-2 outline-accent"
        )}
      >
        {items.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-14 text-center text-sm text-muted-foreground">
            {activeView === "trash" ? "Trash is empty." : "No files yet — drop files anywhere here or click Upload."}
          </p>
        )}
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind];
          const isSelected = selected.has(item.id);
          return (
            <button
              key={item.id}
              onClick={(e) => {
                if (e.shiftKey || e.ctrlKey || e.metaKey) toggleSelect(item.id);
                else setDetail(item);
              }}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-accent",
                isSelected && "ring-2 ring-accent"
              )}
            >
              <span
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(item.id);
                }}
                className={cn(
                  "absolute left-2 top-2 z-10 flex size-5 items-center justify-center rounded border bg-background text-xs",
                  isSelected ? "border-accent bg-accent text-accent-foreground" : "opacity-0 group-hover:opacity-100"
                )}
              >
                {isSelected && "✓"}
              </span>
              {item.favorite && (
                <Star className="absolute right-2 top-2 z-10 size-4 fill-accent text-accent" />
              )}
              {item.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.alt} className="aspect-square w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-secondary">
                  {Icon && <Icon className="size-10 text-muted-foreground" />}
                </div>
              )}
              <div className="p-2">
                <p className="truncate text-xs font-medium">{item.filename}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatBytes(item.size)}
                  {item.usageCount > 0 && ` · used in ${item.usageCount}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Click a file for details — Ctrl/Shift-click to multi-select.
      </p>

      {/* Detail drawer */}
      {detail && (
        <DetailPanel
          item={detail}
          folders={folders}
          pending={pending}
          onClose={() => setDetail(null)}
          onRun={run}
        />
      )}
    </div>
  );
}

function DetailPanel({
  item,
  folders,
  pending,
  onClose,
  onRun,
}: {
  item: MediaItem;
  folders: Array<{ id: string; name: string }>;
  pending: boolean;
  onClose: () => void;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [form, setForm] = React.useState({
    alt: item.alt,
    caption: item.caption,
    credit: item.credit,
    tags: item.tags,
    folderId: item.folderId ?? "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-serif text-lg font-semibold">{item.filename}</h2>
            <p className="text-xs text-muted-foreground">
              {item.mimeType} · {formatBytes(item.size)}
              {item.width && item.height && ` · ${item.width}×${item.height}`}
              {" · "}
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </div>

        {item.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.alt} className="mt-3 max-h-56 w-full rounded-lg border object-contain" />
        )}

        <div className="mt-3 flex items-center gap-2">
          <Badge variant={item.usageCount > 0 ? "accent" : "outline"}>
            {item.usageCount > 0 ? `Used in ${item.usageCount} article(s)` : "Not used yet"}
          </Badge>
          <code className="truncate rounded bg-muted px-2 py-0.5 text-xs">{item.url}</code>
        </div>

        <div className="mt-4 grid gap-3">
          <Input placeholder="Alt text (accessibility & SEO)" value={form.alt} onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))} className="h-9" />
          <Input placeholder="Caption" value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} className="h-9" />
          <Input placeholder="Credit / copyright" value={form.credit} onChange={(e) => setForm((f) => ({ ...f, credit: e.target.value }))} className="h-9" />
          <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="h-9" />
          <select
            value={form.folderId}
            onChange={(e) => setForm((f) => ({ ...f, folderId: e.target.value }))}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="accent"
            size="sm"
            disabled={pending}
            onClick={() =>
              onRun(() => updateMediaMeta(item.id, { ...form, folderId: form.folderId || null }))
            }
          >
            Save details
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => onRun(() => toggleFavoriteMedia(item.id))}>
            <Star className={cn(item.favorite && "fill-current")} />
            {item.favorite ? "Unfavorite" : "Favorite"}
          </Button>
          {item.deleted ? (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => onRun(() => restoreMedia([item.id]))}>
              <ArchiveRestore /> Restore
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => onRun(() => trashMedia([item.id]))}>
              <Archive /> Trash
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
