import { prisma } from "@/lib/prisma";
import { articleInclude, liveWhere } from "@/lib/articles";
import { sendMail } from "@/lib/email";
import { weeklyDigestTemplate } from "@/lib/email/templates";
import { siteConfig } from "@/lib/site";

/**
 * Weekly digest: for each opted-in user, the week's top articles from
 * their interests (falling back to the week's most-viewed). Triggered
 * manually from the admin panel; wire to a cron (e.g. Vercel Cron
 * hitting a route) in production.
 */
export async function sendWeeklyDigestBatch(limit = 100) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const subscribers = await prisma.notificationPreferences.findMany({
    where: { weeklyDigest: true, emailEnabled: true },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailFrequency: true,
          interests: { select: { topic: true } },
        },
      },
    },
  });

  const weekTop = await prisma.article.findMany({
    where: { ...liveWhere(), publishedAt: { gte: weekAgo } },
    include: articleInclude,
    orderBy: { views: "desc" },
    take: 20,
  });
  if (weekTop.length === 0) return { sent: 0, skipped: subscribers.length, reason: "no articles this week" };

  let sent = 0;
  for (const sub of subscribers) {
    if (sub.user.emailFrequency === "none") continue;
    const topics = new Set(sub.user.interests.map((i) => i.topic));
    const personalized = weekTop.filter((a) => a.category && topics.has(a.category.slug));
    const picks = (personalized.length >= 3 ? personalized : weekTop).slice(0, 5);

    const itemsHtml = picks
      .map(
        (a) => `<div style="margin:0 0 20px;">
          <a href="${siteConfig.url}/articles/${a.slug}" style="font-family:Georgia,serif;font-size:17px;font-weight:bold;color:#1c1917;text-decoration:none;">${a.title}</a>
          <p style="margin:4px 0 0;font-size:14px;color:#78716c;line-height:1.5;">${a.excerpt}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#a8a29e;">${a.category?.name ?? ""} · ${a.readingTime} min read</p>
        </div>`
      )
      .join("");

    const t = weeklyDigestTemplate(sub.user.name, itemsHtml);
    try {
      await sendMail({ to: sub.user.email, ...t });
      sent += 1;
    } catch (err) {
      console.error(`digest to ${sub.user.email} failed:`, err);
    }
  }

  return { sent, skipped: subscribers.length - sent };
}
