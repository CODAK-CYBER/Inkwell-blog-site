"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAd, saveAd, toggleAd, type AdInput } from "@/lib/actions/ads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/auth/form-field";
import { cn } from "@/lib/utils";

interface AdRow {
  id: string;
  name: string;
  placement: string;
  imageUrl: string;
  html: string;
  targetUrl: string;
  weight: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
  impressions: number;
  clicks: number;
}

const empty: AdInput = {
  name: "",
  placement: "home_banner",
  imageUrl: "",
  html: "",
  targetUrl: "",
  weight: 1,
  startsAt: "",
  endsAt: "",
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AdsManager({ ads }: { ads: AdRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(input: AdInput, id?: string) {
    setPending(true);
    setError(null);
    const res = await saveAd(input, id);
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Megaphone className="size-5 text-accent" />
          Advertisements
        </h1>
        <Button variant="accent" size="sm" onClick={() => setEditing(editing === "new" ? null : "new")}>
          <Plus />
          New ad
        </Button>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Weighted rotation per placement. Premium members never see ads. For AdSense,
        create an ad with the embed HTML snippet.
      </p>

      <FormError message={error} />

      {editing === "new" && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <AdForm initial={empty} pending={pending} onSubmit={(i) => submit(i)} onCancel={() => setEditing(null)} />
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {ads.length === 0 && (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No ads yet.
          </p>
        )}
        {ads.map((ad) => {
          const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
          return (
            <li key={ad.id} className={cn("rounded-xl border bg-card", !ad.active && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="font-medium">{ad.name}</span>
                <Badge variant="outline">{ad.placement.replace(/_/g, " ")}</Badge>
                {!ad.active && <Badge variant="outline">Paused</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {ad.impressions.toLocaleString()} views · {ad.clicks} clicks · {ctr}% CTR
                </span>
                <Button variant="outline" size="sm" disabled={pending} onClick={async () => {
                  setPending(true);
                  await toggleAd(ad.id);
                  setPending(false);
                  router.refresh();
                }}>
                  {ad.active ? "Pause" : "Activate"}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${ad.name}`} onClick={() => setEditing(editing === ad.id ? null : ad.id)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label={`Delete ${ad.name}`}
                  disabled={pending}
                  onClick={async () => {
                    if (!window.confirm(`Delete "${ad.name}"?`)) return;
                    setPending(true);
                    await deleteAd(ad.id);
                    setPending(false);
                    router.refresh();
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
              {editing === ad.id && (
                <div className="border-t p-4">
                  <AdForm initial={ad} pending={pending} onSubmit={(i) => submit(i, ad.id)} onCancel={() => setEditing(null)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AdForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: AdInput;
  pending: boolean;
  onSubmit: (input: AdInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<AdInput>(initial);
  const set = <K extends keyof AdInput>(key: K, value: AdInput[K]) =>
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
        <label className="text-xs font-medium text-muted-foreground">Placement</label>
        <select value={form.placement} onChange={(e) => set("placement", e.target.value)} className={selectClass}>
          <option value="home_banner">Homepage banner</option>
          <option value="article_bottom">Below articles</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Image URL</label>
        <Input value={form.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…/banner.png" className="h-9" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Click-through URL</label>
        <Input value={form.targetUrl ?? ""} onChange={(e) => set("targetUrl", e.target.value)} placeholder="https://advertiser.com" className="h-9" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground">
          Embed HTML (alternative to image — e.g. AdSense snippet)
        </label>
        <textarea
          value={form.html ?? ""}
          onChange={(e) => set("html", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Weight (1–10)</label>
        <Input type="number" min={1} max={10} value={form.weight ?? 1} onChange={(e) => set("weight", Number(e.target.value))} className="h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Starts</label>
          <input type="datetime-local" value={form.startsAt ?? ""} onChange={(e) => set("startsAt", e.target.value)} className={cn(selectClass, "[color-scheme:light] dark:[color-scheme:dark]")} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Ends</label>
          <input type="datetime-local" value={form.endsAt ?? ""} onChange={(e) => set("endsAt", e.target.value)} className={cn(selectClass, "[color-scheme:light] dark:[color-scheme:dark]")} />
        </div>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? <Spinner className="size-4" /> : "Save ad"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
