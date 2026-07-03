import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";

export const metadata: Metadata = {
  title: "Announcements — admin",
  robots: { index: false },
};

export default async function AdminAnnouncementsPage() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) redirect("/admin");

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AnnouncementsManager
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        level: a.level,
        audience: a.audience,
        showBanner: a.showBanner,
        active: a.active,
        expiresAt: a.expiresAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
