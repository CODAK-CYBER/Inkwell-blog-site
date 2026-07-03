import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

/** Bell summary: unread count + most recent notifications. */
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ unread: 0, notifications: [] }, { status: 401 });

  const [unread, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, title: true, url: true, read: true, priority: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ unread, notifications });
}
