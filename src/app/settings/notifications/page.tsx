import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { NotificationsForm } from "@/components/settings/notifications-form";

export const metadata: Metadata = {
  title: "Notification settings",
  robots: { index: false },
};

export default async function NotificationSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/settings/notifications");

  const prefs = await prisma.notificationPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <NotificationsForm
      initial={{
        emailEnabled: prefs?.emailEnabled ?? true,
        inAppEnabled: prefs?.inAppEnabled ?? true,
        pushEnabled: prefs?.pushEnabled ?? false,
        weeklyDigest: prefs?.weeklyDigest ?? true,
        breakingNews: prefs?.breakingNews ?? false,
        newFollower: prefs?.newFollower ?? true,
        newLoginAlert: prefs?.newLoginAlert ?? true,
        emailFrequency: session.user.emailFrequency ?? "weekly",
      }}
    />
  );
}
