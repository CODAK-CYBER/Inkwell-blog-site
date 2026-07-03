import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { getReadingStreak } from "@/lib/streak";

/**
 * Achievement definitions. Awarded lazily by `checkAchievements` after
 * relevant actions (commenting, reading, reacting, publishing).
 */
const DEFINITIONS = [
  { slug: "first-comment", name: "First Comment", description: "Joined the conversation for the first time.", icon: "💬" },
  { slug: "first-reaction", name: "First Reaction", description: "Reacted to an article for the first time.", icon: "❤️" },
  { slug: "reader-10", name: "Bookworm", description: "Read 10 articles.", icon: "📚" },
  { slug: "reader-100", name: "Centurion Reader", description: "Read 100 articles.", icon: "🏛️" },
  { slug: "streak-7", name: "Loyal Reader", description: "A 7-day reading streak.", icon: "🔥" },
  { slug: "commenter-25", name: "Top Commenter", description: "Posted 25 comments.", icon: "🗣️" },
  { slug: "saver-10", name: "Curator", description: "Saved 10 articles for later.", icon: "🔖" },
  { slug: "author-first-publish", name: "Published Author", description: "Published a first article.", icon: "✍️" },
  { slug: "author-10k-views", name: "Crowd Puller", description: "Articles passed 10,000 total views.", icon: "🌟" },
] as const;

export type AchievementEvent = "comment" | "reaction" | "read" | "save" | "publish";

let seeded = false;
async function ensureDefinitions() {
  if (seeded) return;
  for (const d of DEFINITIONS) {
    await prisma.badge.upsert({
      where: { slug: d.slug },
      create: d,
      update: { name: d.name, description: d.description, icon: d.icon },
    });
  }
  seeded = true;
}

async function award(userId: string, slug: string) {
  const badge = await prisma.badge.findUnique({ where: { slug } });
  if (!badge) return;
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return;
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
  await notify({
    userIds: [userId],
    type: "achievement",
    title: `Achievement unlocked: ${badge.icon} ${badge.name}`,
    body: badge.description,
    url: "/dashboard",
    priority: "low",
  });
}

/**
 * Evaluate achievements relevant to an event. Fire-and-forget from
 * actions — never blocks or throws into the caller.
 */
export async function checkAchievements(userId: string, event: AchievementEvent) {
  try {
    await ensureDefinitions();

    if (event === "comment") {
      const count = await prisma.comment.count({ where: { userId } });
      if (count >= 1) await award(userId, "first-comment");
      if (count >= 25) await award(userId, "commenter-25");
    }

    if (event === "reaction") {
      await award(userId, "first-reaction");
    }

    if (event === "read") {
      const count = await prisma.readingHistory.count({ where: { userId } });
      if (count >= 10) await award(userId, "reader-10");
      if (count >= 100) await award(userId, "reader-100");
      const streak = await getReadingStreak(userId);
      if (streak >= 7) await award(userId, "streak-7");
    }

    if (event === "save") {
      const count = await prisma.bookmark.count({ where: { userId } });
      if (count >= 10) await award(userId, "saver-10");
    }

    if (event === "publish") {
      const count = await prisma.article.count({ where: { authorId: userId, status: "published" } });
      if (count >= 1) await award(userId, "author-first-publish");
      const views = await prisma.article.aggregate({
        where: { authorId: userId },
        _sum: { views: true },
      });
      if ((views._sum.views ?? 0) >= 10_000) await award(userId, "author-10k-views");
    }
  } catch (err) {
    console.error("checkAchievements failed:", err);
  }
}
