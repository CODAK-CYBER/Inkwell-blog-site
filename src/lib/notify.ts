import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { siteConfig } from "@/lib/site";

export type NotificationType =
  | "new_article"
  | "breaking"
  | "reply"
  | "mention"
  | "follower"
  | "achievement"
  | "announcement"
  | "security";

export type Priority = "critical" | "high" | "medium" | "low";

interface NotifyInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
  priority?: Priority;
  /** Also email users who have email notifications enabled (critical always emails). */
  email?: boolean;
}

/** Which preference column gates each notification type (undefined = always deliver in-app). */
const PREF_GATE: Partial<Record<NotificationType, "breakingNews" | "newFollower" | "inAppEnabled">> = {
  breaking: "breakingNews",
  follower: "newFollower",
};

/**
 * Fan-out engine: creates in-app notifications (honoring per-user
 * preferences) and optionally emails high-priority ones. Never throws —
 * communication must not break the action that triggered it.
 */
export async function notify(input: NotifyInput) {
  try {
    const userIds = [...new Set(input.userIds)].filter(Boolean);
    if (userIds.length === 0) return;
    const priority = input.priority ?? "medium";

    const prefs = await prisma.notificationPreferences.findMany({
      where: { userId: { in: userIds } },
    });
    const prefFor = (userId: string) => prefs.find((p) => p.userId === userId);

    const gate = PREF_GATE[input.type];
    const recipients = userIds.filter((userId) => {
      const p = prefFor(userId);
      if (!p) return true; // defaults are opt-in
      if (p.inAppEnabled === false && priority !== "critical") return false;
      if (gate && p[gate] === false) return false;
      return true;
    });

    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((userId) => ({
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          url: input.url,
          priority,
        })),
      });
    }

    // Email channel for high/critical (or explicitly requested)
    if (input.email || priority === "critical") {
      const emailable = recipients.filter((userId) => {
        const p = prefFor(userId);
        return priority === "critical" || !p || p.emailEnabled !== false;
      });
      if (emailable.length) {
        const users = await prisma.user.findMany({
          where: { id: { in: emailable } },
          select: { email: true, name: true },
        });
        const url = input.url ? `${siteConfig.url}${input.url}` : siteConfig.url;
        await Promise.allSettled(
          users.map((u) =>
            sendMail({
              to: u.email,
              subject: `${input.title} — ${siteConfig.name}`,
              html: `<p>Hi ${u.name},</p><p>${input.body ?? input.title}</p><p><a href="${url}">Read on ${siteConfig.name}</a></p>`,
            })
          )
        );
      }
    }
  } catch (err) {
    console.error("notify() failed:", err);
  }
}

/** All followers of a target (author username, category slug, or tag slug). */
export async function followerIdsOf(targetType: "author" | "category" | "tag", targetKey: string) {
  const rows = await prisma.follow.findMany({
    where: { targetType, targetKey },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
