"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import {
  deleteAnnouncement,
  saveAnnouncement,
  toggleAnnouncement,
  type AnnouncementInput,
} from "@/lib/actions/moderation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/auth/form-field";
import { cn } from "@/lib/utils";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  level: string;
  audience: string;
  showBanner: boolean;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AnnouncementsManager({ announcements }: { announcements: AnnouncementRow[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<AnnouncementInput>({
    title: "",
    body: "",
    level: "info",
    audience: "all",
    showBanner: true,
    expiresAt: "",
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Megaphone className="size-5 text-accent" />
          Announcements
        </h1>
        <Button variant="accent" size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus />
          New announcement
        </Button>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Broadcast to the notification center — optionally with a sitewide banner.
      </p>

      <FormError message={error} />

      {showCreate && (
        <form
          className="mt-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(null);
            const res = await saveAnnouncement(form);
            setPending(false);
            if (res?.error) {
              setError(res.error);
              return;
            }
            setShowCreate(false);
            setForm({ title: "", body: "", level: "info", audience: "all", showBanner: true, expiresAt: "" });
            router.refresh();
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Message *</label>
            <textarea
              required
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Level</label>
            <select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} className={selectClass}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Audience</label>
            <select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} className={selectClass}>
              <option value="all">Everyone</option>
              <option value="premium">Premium members</option>
              <option value="authors">Authors & editors</option>
              <option value="staff">Staff only</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Expires (optional)</label>
            <input
              type="datetime-local"
              value={form.expiresAt ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className={cn(selectClass, "[color-scheme:light] dark:[color-scheme:dark]")}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={form.showBanner}
              onChange={(e) => setForm((f) => ({ ...f, showBanner: e.target.checked }))}
              className="size-4 accent-[var(--accent)]"
            />
            Show sitewide banner
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : "Publish announcement"}
            </Button>
          </div>
        </form>
      )}

      <ul className="mt-4 space-y-2">
        {announcements.length === 0 && (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No announcements yet.
          </p>
        )}
        {announcements.map((a) => (
          <li key={a.id} className={cn("rounded-xl border bg-card p-4", !a.active && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={a.level === "critical" ? "outline" : a.level === "warning" ? "secondary" : "accent"}
                className={cn("capitalize", a.level === "critical" && "border-destructive/60 text-destructive")}
              >
                {a.level}
              </Badge>
              <Badge variant="outline" className="capitalize">{a.audience}</Badge>
              {a.showBanner && <Badge variant="secondary">Banner</Badge>}
              {!a.active && <Badge variant="outline">Inactive</Badge>}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
                {a.expiresAt && ` · expires ${new Date(a.expiresAt).toLocaleString()}`}
              </span>
            </div>
            <p className="mt-2 font-medium">{a.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{a.body}</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  await toggleAnnouncement(a.id);
                  setPending(false);
                  router.refresh();
                }}
              >
                {a.active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={async () => {
                  if (!window.confirm("Delete this announcement?")) return;
                  setPending(true);
                  await deleteAnnouncement(a.id);
                  setPending(false);
                  router.refresh();
                }}
              >
                <Trash2 />
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
