"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { checkAchievements } from "@/lib/achievements";

async function requireUserId() {
  const session = await getServerSession();
  if (!session) throw new Error("Not signed in");
  return session.user.id;
}

export async function toggleBookmark(articleSlug: string) {
  const userId = await requireUserId();
  const existing = await prisma.bookmark.findUnique({
    where: { userId_articleSlug: { userId, articleSlug } },
  });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
  } else {
    await prisma.bookmark.create({ data: { userId, articleSlug } });
    checkAchievements(userId, "save").catch(() => {});
  }
  revalidatePath("/saved");
  return { bookmarked: !existing };
}

/**
 * One reaction per user per article. Same type toggles off; a different
 * type switches the reaction.
 */
export async function toggleLike(articleSlug: string, type = "like") {
  const userId = await requireUserId();
  const existing = await prisma.like.findUnique({
    where: { userId_articleSlug: { userId, articleSlug } },
  });

  let current: string | null;
  if (existing && existing.type === type) {
    await prisma.like.delete({ where: { id: existing.id } });
    current = null;
  } else if (existing) {
    await prisma.like.update({ where: { id: existing.id }, data: { type } });
    current = type;
  } else {
    await prisma.like.create({ data: { userId, articleSlug, type } });
    current = type;
    checkAchievements(userId, "reaction").catch(() => {});
  }

  const count = await prisma.like.count({ where: { articleSlug } });
  return { liked: current !== null, reaction: current, count };
}

/** Fire-and-forget from the article page; also powers "reading history". */
export async function recordReading(articleSlug: string, progress = 0) {
  const session = await getServerSession();
  if (!session) return; // anonymous readers aren't tracked
  await prisma.readingHistory.upsert({
    where: { userId_articleSlug: { userId: session.user.id, articleSlug } },
    create: { userId: session.user.id, articleSlug, progress },
    update: { readAt: new Date(), progress: { set: Math.max(progress, 0) } },
  });
  checkAchievements(session.user.id, "read").catch(() => {});
}

// ---------------- Reading lists ----------------

export async function createReadingList(name: string, description?: string) {
  const userId = await requireUserId();
  const clean = name.trim();
  if (!clean) return { error: "Give your list a name." };
  const list = await prisma.readingList.create({
    data: { userId, name: clean, description: description?.trim() || null },
  });
  revalidatePath("/saved");
  return { id: list.id };
}

export async function renameReadingList(listId: string, name: string) {
  const userId = await requireUserId();
  const clean = name.trim();
  if (!clean) return { error: "Give your list a name." };
  await prisma.readingList.update({
    where: { id: listId, userId },
    data: { name: clean },
  });
  revalidatePath("/saved");
  return { success: true };
}

export async function deleteReadingList(listId: string) {
  const userId = await requireUserId();
  // Bookmarks survive (listId set null via relation onDelete: SetNull)
  await prisma.readingList.delete({ where: { id: listId, userId } });
  revalidatePath("/saved");
  return { success: true };
}

export async function moveBookmarkToList(bookmarkId: string, listId: string | null) {
  const userId = await requireUserId();
  if (listId) {
    const list = await prisma.readingList.findFirst({ where: { id: listId, userId } });
    if (!list) return { error: "List not found." };
  }
  await prisma.bookmark.update({
    where: { id: bookmarkId, userId },
    data: { listId },
  });
  revalidatePath("/saved");
  return { success: true };
}

export async function toggleArchiveBookmark(bookmarkId: string) {
  const userId = await requireUserId();
  const bookmark = await prisma.bookmark.findFirst({ where: { id: bookmarkId, userId } });
  if (!bookmark) return { error: "Bookmark not found." };
  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: { archived: !bookmark.archived },
  });
  revalidatePath("/saved");
  return { archived: !bookmark.archived };
}

export async function removeBookmark(bookmarkId: string) {
  const userId = await requireUserId();
  await prisma.bookmark.delete({ where: { id: bookmarkId, userId } });
  revalidatePath("/saved");
  return { success: true };
}

export async function toggleFollow(targetType: "author" | "category" | "tag", targetKey: string) {
  const userId = await requireUserId();
  const existing = await prisma.follow.findUnique({
    where: { userId_targetType_targetKey: { userId, targetType, targetKey } },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({ data: { userId, targetType, targetKey } });
    // New-follower notification for authors
    if (targetType === "author") {
      const [followed, follower] = await Promise.all([
        prisma.user.findFirst({
          where: { OR: [{ username: targetKey }, { id: targetKey }] },
          select: { id: true },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
      ]);
      if (followed && followed.id !== userId && follower) {
        notify({
          userIds: [followed.id],
          type: "follower",
          title: `${follower.name} started following you`,
          url: follower.username ? `/u/${follower.username}` : undefined,
          priority: "high",
        }).catch(() => {});
      }
    }
  }
  return { following: !existing };
}
