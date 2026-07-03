"use client";

import * as React from "react";
import { ImagePlus, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface PickerAsset {
  id: string;
  url: string;
  filename: string;
  alt: string | null;
}

/** Library + upload dialog used by the editor to pick images. */
export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: { url: string; alt: string }) => void;
}) {
  const [assets, setAssets] = React.useState<PickerAsset[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media/list?kind=image&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setAssets(data.media ?? []);
    } catch {
      setError("Couldn't load the media library.");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (open) {
      setError(null);
      load("");
    }
  }, [open, load]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, open, load]);

  async function upload(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    for (const f of files) form.append("files", f);
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
      } else {
        const failed = data.results.filter((r: { error?: string }) => r.error);
        if (failed.length) {
          setError(failed.map((f: { filename: string; error: string }) => `${f.filename}: ${f.error}`).join(" · "));
        }
        const first = data.results.find((r: { id?: string; error?: string }) => r.id && !r.error);
        await load(q);
        if (first && files.length === 1) {
          onSelect({ url: first.url, alt: "" });
          onClose();
        }
      }
    } catch {
      setError("Upload failed — check your connection.");
    }
    setUploading(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media picker"
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b p-4">
          <ImagePlus className="size-5 text-accent" />
          <h2 className="font-serif text-lg font-semibold">Insert image</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="accent" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Spinner className="size-4" /> : <UploadCloud />}
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && upload(e.target.files)}
            />
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
              <X />
            </Button>
          </div>
        </div>

        <div className="p-4">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your library…" className="h-9" />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner />
            </div>
          ) : assets.length === 0 ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No images yet — upload your first one.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => {
                    onSelect({ url: asset.url, alt: asset.alt ?? "" });
                    onClose();
                  }}
                  className={cn(
                    "group overflow-hidden rounded-lg border transition-all hover:border-accent hover:shadow-sm"
                  )}
                  title={asset.filename}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.alt ?? ""} className="aspect-square w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
