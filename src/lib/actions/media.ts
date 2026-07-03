"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { removeFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

async function requireMediaManager(perm: "upload" | "delete" = "upload") {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { media: [perm] })) {
    throw new Error("Not permitted");
  }
  return session;
}

const revalidate = () => revalidatePath("/admin/media");

export async function updateMediaMeta(
  id: string,
  data: { alt?: string; caption?: string; credit?: string; tags?: string; folderId?: string | null }
) {
  await requireMediaManager();
  await prisma.media.update({
    where: { id },
    data: {
      alt: data.alt?.trim() || null,
      caption: data.caption?.trim() || null,
      credit: data.credit?.trim() || null,
      tags: data.tags?.trim() || null,
      folderId: data.folderId ?? null,
    },
  });
  revalidate();
  return { success: true };
}

export async function toggleFavoriteMedia(id: string) {
  await requireMediaManager();
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return { error: "Not found" };
  await prisma.media.update({ where: { id }, data: { favorite: !media.favorite } });
  revalidate();
  return { favorite: !media.favorite };
}

/** Soft delete. Assets referenced by articles are protected. */
export async function trashMedia(ids: string[]) {
  const session = await requireMediaManager("delete");
  const used = await prisma.mediaUsage.findMany({
    where: { mediaId: { in: ids } },
    select: { mediaId: true },
  });
  const usedIds = new Set(used.map((u) => u.mediaId));
  const deletable = ids.filter((id) => !usedIds.has(id));

  if (deletable.length) {
    await prisma.media.updateMany({
      where: { id: { in: deletable } },
      data: { deletedAt: new Date() },
    });
    await logActivity({
      userId: session.user.id,
      action: "media.trashed",
      targetType: "media",
      detail: `${deletable.length} file(s)`,
    });
  }
  revalidate();
  if (usedIds.size > 0) {
    return {
      trashed: deletable.length,
      error: `${usedIds.size} file(s) skipped — still referenced by articles.`,
    };
  }
  return { trashed: deletable.length };
}

export async function restoreMedia(ids: string[]) {
  await requireMediaManager("delete");
  await prisma.media.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: null },
  });
  revalidate();
  return { success: true };
}

export async function deleteMediaForever(ids: string[]) {
  const session = await requireMediaManager("delete");
  const items = await prisma.media.findMany({
    where: { id: { in: ids }, deletedAt: { not: null } }, // must be in trash first
  });
  for (const item of items) {
    await removeFile(item.url);
  }
  await prisma.media.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
  await logActivity({
    userId: session.user.id,
    action: "media.deleted",
    targetType: "media",
    detail: `${items.length} file(s)`,
  });
  revalidate();
  return { deleted: items.length };
}

// -------- Folders --------

export async function createMediaFolder(name: string) {
  await requireMediaManager();
  const clean = name.trim();
  if (!clean) return { error: "Folder needs a name." };
  await prisma.mediaFolder.create({ data: { name: clean } });
  revalidate();
  return { success: true };
}

export async function renameMediaFolder(id: string, name: string) {
  await requireMediaManager();
  const clean = name.trim();
  if (!clean) return { error: "Folder needs a name." };
  await prisma.mediaFolder.update({ where: { id }, data: { name: clean } });
  revalidate();
  return { success: true };
}

export async function deleteMediaFolder(id: string) {
  await requireMediaManager("delete");
  // Files survive — they just lose the folder (relation is SetNull).
  await prisma.mediaFolder.delete({ where: { id } });
  revalidate();
  return { success: true };
}

export async function moveMediaToFolder(ids: string[], folderId: string | null) {
  await requireMediaManager();
  await prisma.media.updateMany({
    where: { id: { in: ids } },
    data: { folderId },
  });
  revalidate();
  return { success: true };
}
