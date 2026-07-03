import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatBytes } from "@/lib/media";
import { buttonVariants } from "@/components/ui/button";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata: Metadata = {
  title: "Media library — admin",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ kind?: string; folder?: string; q?: string; view?: string }>;
}

export default async function AdminMediaPage({ searchParams }: Props) {
  const { kind, folder, q, view } = await searchParams;
  const query = q?.trim() ?? "";

  const where = {
    deletedAt: view === "trash" ? { not: null } : null,
    ...(view === "favorites" ? { favorite: true } : {}),
    ...(kind ? { kind } : {}),
    ...(folder ? { folderId: folder } : {}),
    ...(query
      ? {
          OR: [
            { filename: { contains: query } },
            { alt: { contains: query } },
            { tags: { contains: query } },
          ],
        }
      : {}),
  };

  const [media, folders, totals] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { usage: true } } },
    }),
    prisma.mediaFolder.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { media: { where: { deletedAt: null } } } } },
    }),
    prisma.media.aggregate({
      where: { deletedAt: null },
      _sum: { size: true },
      _count: true,
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Media library</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totals._count} asset{totals._count === 1 ? "" : "s"} ·{" "}
            {formatBytes(totals._sum.size ?? 0)} used
          </p>
        </div>
        <Link
          href="/admin/media/intelligence"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <BarChart3 className="size-4" />
          Asset intelligence
        </Link>
      </div>

      <MediaLibrary
        items={media.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          kind: m.kind,
          mimeType: m.mimeType,
          size: m.size,
          width: m.width,
          height: m.height,
          alt: m.alt ?? "",
          caption: m.caption ?? "",
          credit: m.credit ?? "",
          tags: m.tags ?? "",
          favorite: m.favorite,
          folderId: m.folderId,
          deleted: Boolean(m.deletedAt),
          usageCount: m._count.usage,
          createdAt: m.createdAt.toISOString(),
        }))}
        folders={folders.map((f) => ({ id: f.id, name: f.name, count: f._count.media }))}
        activeKind={kind ?? ""}
        activeFolder={folder ?? ""}
        activeView={view ?? ""}
        query={query}
      />
    </div>
  );
}
