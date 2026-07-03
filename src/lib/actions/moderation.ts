"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission, isAdminRole } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { sendWeeklyDigestBatch } from "@/lib/digest";

async function requireModerator() {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { comment: ["moderate"] })) {
    throw new Error("Not permitted");
  }
  return session;
}

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) throw new Error("Not permitted");
  return session;
}

export async function resolveReport(id: string, outcome: "resolved" | "dismissed") {
  const session = await requireModerator();
  await prisma.report.update({
    where: { id },
    data: { status: outcome, resolvedById: session.user.id, resolvedAt: new Date() },
  });
  await logActivity({
    userId: session.user.id,
    action: `report.${outcome}`,
    targetType: "report",
    targetId: id,
  });
  revalidatePath("/admin/moderation");
  return { success: true };
}

/** Trust & verification: admin grants/revokes the verified checkmark. */
export async function setUserVerified(userId: string, verified: boolean) {
  const session = await requireAdmin();
  const user = await prisma.user.update({ where: { id: userId }, data: { verified } });
  await logActivity({
    userId: session.user.id,
    action: verified ? "user.verified" : "user.unverified",
    targetType: "user",
    targetId: userId,
    detail: user.email,
  });
  if (verified) {
    await notify({
      userIds: [userId],
      type: "announcement",
      title: "Your account is now verified ✓",
      body: "The verified badge now appears next to your name across the site.",
      priority: "high",
    });
  }
  revalidatePath("/admin/users");
  return { success: true };
}

// ---------------- Announcements ----------------

export interface AnnouncementInput {
  title: string;
  body: string;
  level: string; // info | warning | critical
  audience: string; // all | premium | authors | staff
  showBanner: boolean;
  expiresAt?: string | null;
}

export async function saveAnnouncement(input: AnnouncementInput, id?: string) {
  const session = await requireAdmin();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return { error: "Title and message are required." };

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const data = {
    title,
    body,
    level: ["info", "warning", "critical"].includes(input.level) ? input.level : "info",
    audience: input.audience,
    showBanner: input.showBanner,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
  };

  let announcement;
  if (id) {
    announcement = await prisma.announcement.update({ where: { id }, data });
  } else {
    announcement = await prisma.announcement.create({ data });
    // Fan out to the notification center for the selected audience.
    const audienceWhere =
      data.audience === "premium"
        ? { role: "premium" }
        : data.audience === "authors"
          ? { role: { in: ["author", "editor"] } }
          : data.audience === "staff"
            ? { role: { in: ["editor", "admin", "superadmin", "moderator"] } }
            : {};
    const users = await prisma.user.findMany({ where: audienceWhere, select: { id: true } });
    await notify({
      userIds: users.map((u) => u.id),
      type: "announcement",
      title,
      body: body.slice(0, 140),
      priority: data.level === "critical" ? "critical" : data.level === "warning" ? "high" : "medium",
    });
  }

  await logActivity({
    userId: session.user.id,
    action: id ? "announcement.updated" : "announcement.created",
    targetType: "announcement",
    targetId: announcement.id,
    detail: title,
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function toggleAnnouncement(id: string) {
  await requireAdmin();
  const a = await prisma.announcement.findUnique({ where: { id } });
  if (!a) return { error: "Not found." };
  await prisma.announcement.update({ where: { id }, data: { active: !a.active } });
  revalidatePath("/admin/announcements");
  revalidatePath("/", "layout");
  return { active: !a.active };
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/admin/announcements");
  revalidatePath("/", "layout");
  return { success: true };
}

// ---------------- Digest ----------------

export async function triggerWeeklyDigest() {
  const session = await requireAdmin();
  const result = await sendWeeklyDigestBatch();
  await logActivity({
    userId: session.user.id,
    action: "digest.sent",
    detail: `${result.sent} recipients`,
  });
  return result;
}
