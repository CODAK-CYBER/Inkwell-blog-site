"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

async function requireUserId() {
  const session = await getServerSession();
  if (!session) throw new Error("Not signed in");
  return session.user.id;
}

export async function markNotificationRead(id: string) {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
  return { success: true };
}

export async function deleteNotification(id: string) {
  const userId = await requireUserId();
  await prisma.notification.deleteMany({ where: { id, userId } });
  revalidatePath("/notifications");
  return { success: true };
}

export async function clearReadNotifications() {
  const userId = await requireUserId();
  await prisma.notification.deleteMany({ where: { userId, read: true } });
  revalidatePath("/notifications");
  return { success: true };
}
