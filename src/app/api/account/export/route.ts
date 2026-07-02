import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

/** GDPR-style data export: everything we store about the signed-in user. */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userId = session.user.id;
  const [user, interests, follows, bookmarks, likes, readingHistory, readingLists, loginEvents, notificationPrefs] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          // everything except internal/auth columns
          name: true,
          email: true,
          username: true,
          bio: true,
          website: true,
          location: true,
          image: true,
          coverImage: true,
          socialLinks: true,
          language: true,
          timezone: true,
          profileVisibility: true,
          showReadingActivity: true,
          preferredContentTypes: true,
          emailFrequency: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.userInterest.findMany({ where: { userId }, select: { topic: true, createdAt: true } }),
      prisma.follow.findMany({
        where: { userId },
        select: { targetType: true, targetKey: true, createdAt: true },
      }),
      prisma.bookmark.findMany({ where: { userId }, select: { articleSlug: true, createdAt: true } }),
      prisma.like.findMany({ where: { userId }, select: { articleSlug: true, createdAt: true } }),
      prisma.readingHistory.findMany({
        where: { userId },
        select: { articleSlug: true, readAt: true, progress: true },
      }),
      prisma.readingList.findMany({
        where: { userId },
        select: { name: true, description: true, isPublic: true, createdAt: true },
      }),
      prisma.loginEvent.findMany({
        where: { userId },
        select: { ipAddress: true, userAgent: true, createdAt: true },
      }),
      prisma.notificationPreferences.findUnique({
        where: { userId },
        select: {
          emailEnabled: true,
          inAppEnabled: true,
          pushEnabled: true,
          weeklyDigest: true,
          breakingNews: true,
          newFollower: true,
          newLoginAlert: true,
        },
      }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    interests,
    follows,
    bookmarks,
    likes,
    readingHistory,
    readingLists,
    notificationPreferences: notificationPrefs,
    loginHistory: loginEvents,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="account-export-${userId}.json"`,
    },
  });
}
