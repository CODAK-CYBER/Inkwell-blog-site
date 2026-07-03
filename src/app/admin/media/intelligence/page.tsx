import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, HardDrive } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatBytes } from "@/lib/media";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Asset intelligence — admin",
  robots: { index: false },
};

const OVERSIZED_IMAGE = 1024 * 1024; // 1 MB

export default async function AssetIntelligencePage() {
  const media = await prisma.media.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { usage: true } } },
    orderBy: { size: "desc" },
  });

  const totalBytes = media.reduce((sum, m) => sum + m.size, 0);
  const byKind = new Map<string, { count: number; bytes: number }>();
  for (const m of media) {
    const entry = byKind.get(m.kind) ?? { count: 0, bytes: 0 };
    entry.count += 1;
    entry.bytes += m.size;
    byKind.set(m.kind, entry);
  }

  const unused = media.filter((m) => m._count.usage === 0);
  const oversized = media.filter((m) => m.kind === "image" && m.size > OVERSIZED_IMAGE);

  // Duplicate content (identical hash) — normally prevented at upload time.
  const hashCounts = new Map<string, number>();
  for (const m of media) hashCounts.set(m.hash, (hashCounts.get(m.hash) ?? 0) + 1);
  const duplicates = media.filter((m) => (hashCounts.get(m.hash) ?? 0) > 1);

  const healthy = oversized.length === 0 && duplicates.length === 0;

  return (
    <div>
      <Link
        href="/admin/media"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to media library
      </Link>
      <h1 className="mt-2 text-xl font-bold">Asset intelligence</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Health report for your {media.length} stored asset{media.length === 1 ? "" : "s"}.
      </p>

      {/* Storage breakdown */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-4">
          <HardDrive className="size-4 text-accent" />
          <p className="mt-2 font-serif text-2xl font-bold">{formatBytes(totalBytes)}</p>
          <p className="text-xs text-muted-foreground">Total storage</p>
        </div>
        {[...byKind.entries()].map(([kind, stats]) => (
          <div key={kind} className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kind}s</p>
            <p className="mt-1 font-serif text-2xl font-bold">{stats.count}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(stats.bytes)}</p>
          </div>
        ))}
      </div>

      {healthy && unused.length === 0 && (
        <p className="mt-6 flex items-center gap-2 rounded-xl border bg-card p-4 text-sm">
          <CheckCircle2 className="size-5 text-accent" />
          All assets healthy — no oversized files, duplicates, or unused assets.
        </p>
      )}

      {/* Oversized */}
      {oversized.length > 0 && (
        <section className="mt-6 rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <AlertTriangle className="size-4 text-accent" />
            Oversized images ({oversized.length})
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Images over 1 MB slow pages down — recommendation: compress before re-uploading.
          </p>
          <ul className="mt-3 divide-y">
            {oversized.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="size-10 rounded border object-cover" />
                <span className="min-w-0 flex-1 truncate font-medium">{m.filename}</span>
                <Badge variant="outline">{formatBytes(m.size)}</Badge>
                <Badge variant={m._count.usage > 0 ? "accent" : "secondary"}>
                  {m._count.usage > 0 ? `Used in ${m._count.usage}` : "Unused"}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Unused */}
      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold">Unused assets ({unused.length})</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Not referenced by any article — safe to delete
          {unused.length > 0 && ` (potential saving: ${formatBytes(unused.reduce((s, m) => s + m.size, 0))})`}.
        </p>
        {unused.length > 0 && (
          <ul className="mt-3 divide-y">
            {unused.slice(0, 20).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{m.filename}</span>
                <Badge variant="outline">{formatBytes(m.size)}</Badge>
                <Badge variant="secondary">Safe to delete ✓</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Duplicates */}
      {duplicates.length > 0 && (
        <section className="mt-6 rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Duplicate content ({duplicates.length})</h2>
          <ul className="mt-3 divide-y">
            {duplicates.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{m.filename}</span>
                <code className="rounded bg-muted px-2 py-0.5 text-xs">{m.hash.slice(0, 12)}…</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Most used */}
      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold">Most used assets</h2>
        <ul className="mt-3 divide-y">
          {media
            .filter((m) => m._count.usage > 0)
            .sort((a, b) => b._count.usage - a._count.usage)
            .slice(0, 10)
            .map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{m.filename}</span>
                <Badge variant="accent">Used in {m._count.usage} article(s)</Badge>
                <Badge variant="outline">Safe to delete? ✗</Badge>
              </li>
            ))}
          {media.every((m) => m._count.usage === 0) && (
            <li className="py-2.5 text-sm text-muted-foreground">No assets in use yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
