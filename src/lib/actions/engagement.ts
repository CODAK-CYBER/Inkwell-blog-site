"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

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
  }
  revalidatePath("/saved");
  return { bookmarked: !existing };
}

export async function toggleLike(articleSlug: string) {
  const userId = await requireUserId();
  const existing = await prisma.like.findUnique({
    where: { userId_articleSlug: { userId, articleSlug } },
  });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId, articleSlug } });
  }
  const count = await prisma.like.count({ where: { articleSlug } });
  return { liked: !existing, count };
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
  }
  return { following: !existing };
}
