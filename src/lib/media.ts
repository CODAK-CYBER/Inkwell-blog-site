import { prisma } from "@/lib/prisma";

/** Upload constraints by asset kind. */
export const MEDIA_RULES: Record<
  string,
  { kind: "image" | "video" | "audio" | "document"; maxBytes: number }
> = {
  "image/jpeg": { kind: "image", maxBytes: 10 * 1024 * 1024 },
  "image/png": { kind: "image", maxBytes: 10 * 1024 * 1024 },
  "image/webp": { kind: "image", maxBytes: 10 * 1024 * 1024 },
  "image/gif": { kind: "image", maxBytes: 15 * 1024 * 1024 },
  "image/avif": { kind: "image", maxBytes: 10 * 1024 * 1024 },
  "image/svg+xml": { kind: "image", maxBytes: 1 * 1024 * 1024 },
  "video/mp4": { kind: "video", maxBytes: 100 * 1024 * 1024 },
  "video/webm": { kind: "video", maxBytes: 100 * 1024 * 1024 },
  "audio/mpeg": { kind: "audio", maxBytes: 50 * 1024 * 1024 },
  "audio/wav": { kind: "audio", maxBytes: 50 * 1024 * 1024 },
  "audio/ogg": { kind: "audio", maxBytes: 50 * 1024 * 1024 },
  "application/pdf": { kind: "document", maxBytes: 25 * 1024 * 1024 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { kind: "document", maxBytes: 25 * 1024 * 1024 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { kind: "document", maxBytes: 25 * 1024 * 1024 },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { kind: "document", maxBytes: 25 * 1024 * 1024 },
  "text/csv": { kind: "document", maxBytes: 10 * 1024 * 1024 },
  "text/plain": { kind: "document", maxBytes: 5 * 1024 * 1024 },
  "application/zip": { kind: "document", maxBytes: 50 * 1024 * 1024 },
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sync MediaUsage rows for an article: which stored assets its markdown
 * content and cover image reference. Called on every article save.
 */
export async function syncMediaUsage(
  articleId: string,
  content: string,
  coverImage: string | null
) {
  const assets = await prisma.media.findMany({
    where: { deletedAt: null },
    select: { id: true, url: true },
  });

  const rows: Array<{ mediaId: string; field: string }> = [];
  for (const asset of assets) {
    if (coverImage && coverImage === asset.url) {
      rows.push({ mediaId: asset.id, field: "cover" });
    }
    if (content.includes(asset.url)) {
      rows.push({ mediaId: asset.id, field: "content" });
    }
  }

  await prisma.$transaction([
    prisma.mediaUsage.deleteMany({ where: { articleId } }),
    ...(rows.length
      ? [
          prisma.mediaUsage.createMany({
            data: rows.map((r) => ({ ...r, articleId })),
          }),
        ]
      : []),
  ]);
}
