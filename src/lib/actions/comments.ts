"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { notify } from "@/lib/notify";
import { checkAchievements } from "@/lib/achievements";
import { logActivity } from "@/lib/activity";
import { BLOCKED_WORDS } from "@/lib/constants";

async function requireSession() {
  const session = await getServerSession();
  if (!session) throw new Error("Not signed in");
  return session;
}

function containsBlockedWords(text: string) {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower));
}

async function revalidateArticle(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { slug: true },
  });
  if (article) revalidatePath(`/articles/${article.slug}`);
}

/** Notify @username mentions found in a comment. */
async function notifyMentions(content: string, authorId: string, articleId: string) {
  const usernames = [...new Set([...content.matchAll(/@([a-z0-9_.-]{3,30})/gi)].map((m) => m[1].toLowerCase()))];
  if (!usernames.length) return;
  const [users, article] = await Promise.all([
    prisma.user.findMany({
      where: { username: { in: usernames }, id: { not: authorId } },
      select: { id: true },
    }),
    prisma.article.findUnique({ where: { id: articleId }, select: { slug: true, title: true } }),
  ]);
  if (!users.length || !article) return;
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { name: true } });
  await notify({
    userIds: users.map((u) => u.id),
    type: "mention",
    title: `${author?.name ?? "Someone"} mentioned you`,
    body: `In a comment on “${article.title}”`,
    url: `/articles/${article.slug}#comments`,
    priority: "high",
  });
}

export async function addComment(articleId: string, content: string, parentId?: string) {
  const session = await requireSession();
  if (session.user.banned) return { error: "Your account can't comment right now." };

  const { getSetting, settingIsOn } = await import("@/lib/settings");
  if (!settingIsOn(await getSetting("commentsEnabled"))) {
    return { error: "Commenting is temporarily disabled platform-wide." };
  }

  const clean = content.trim();
  if (!clean) return { error: "Write something first." };
  if (clean.length > 3000) return { error: "Comments are limited to 3000 characters." };

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, slug: true, title: true, allowComments: true, authorId: true },
  });
  if (!article) return { error: "Article not found." };
  if (!article.allowComments) return { error: "Comments are closed on this article." };

  const flagged = containsBlockedWords(clean);
  const role = session.user.role ?? "user";
  const isStaff = ["editor", "admin", "superadmin", "moderator"].includes(role);

  const comment = await prisma.comment.create({
    data: {
      articleId,
      userId: session.user.id,
      parentId: parentId || null,
      content: clean,
      status: flagged ? "flagged" : "visible",
      isOfficial: isStaff,
    },
  });

  if (!flagged) {
    // Reply → notify the parent comment's author
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (parent && parent.userId !== session.user.id) {
        await notify({
          userIds: [parent.userId],
          type: "reply",
          title: `${session.user.name} replied to your comment`,
          body: clean.slice(0, 120),
          url: `/articles/${article.slug}#comments`,
          priority: "high",
        });
      }
    } else if (article.authorId !== session.user.id) {
      // Top-level comment → notify the article author
      await notify({
        userIds: [article.authorId],
        type: "reply",
        title: `${session.user.name} commented on “${article.title}”`,
        body: clean.slice(0, 120),
        url: `/articles/${article.slug}#comments`,
        priority: "medium",
      });
    }
    await notifyMentions(clean, session.user.id, articleId);
  }

  checkAchievements(session.user.id, "comment").catch(() => {});
  revalidatePath(`/articles/${article.slug}`);

  return {
    id: comment.id,
    flagged,
    ...(flagged ? { notice: "Your comment is being held for moderator review." } : {}),
  };
}

export async function editComment(id: string, content: string) {
  const session = await requireSession();
  const clean = content.trim();
  if (!clean) return { error: "Write something first." };

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return { error: "Comment not found." };
  if (comment.userId !== session.user.id) return { error: "You can only edit your own comments." };

  await prisma.comment.update({
    where: { id },
    data: {
      content: clean,
      editedAt: new Date(),
      status: containsBlockedWords(clean) ? "flagged" : comment.status === "hidden" ? "hidden" : "visible",
    },
  });
  await revalidateArticle(comment.articleId);
  return { success: true };
}

export async function deleteComment(id: string) {
  const session = await requireSession();
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return { error: "Comment not found." };

  const canModerate = hasPermission(session.user.role, { comment: ["moderate"] });
  if (comment.userId !== session.user.id && !canModerate) {
    return { error: "You can't delete this comment." };
  }
  await prisma.comment.delete({ where: { id } }); // replies cascade
  if (comment.userId !== session.user.id) {
    await logActivity({
      userId: session.user.id,
      action: "comment.deleted_by_moderator",
      targetType: "comment",
      detail: comment.content.slice(0, 60),
    });
  }
  await revalidateArticle(comment.articleId);
  revalidatePath("/admin/moderation");
  return { success: true };
}

/** Moderator: hide without deleting (kept for the audit trail). */
export async function setCommentStatus(id: string, status: "visible" | "hidden") {
  const session = await requireSession();
  if (!hasPermission(session.user.role, { comment: ["moderate"] })) {
    return { error: "Not permitted." };
  }
  const comment = await prisma.comment.update({ where: { id }, data: { status } });
  await logActivity({
    userId: session.user.id,
    action: status === "hidden" ? "comment.hidden" : "comment.approved",
    targetType: "comment",
    detail: comment.content.slice(0, 60),
  });
  await revalidateArticle(comment.articleId);
  revalidatePath("/admin/moderation");
  return { success: true };
}

export async function togglePinComment(id: string) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, { comment: ["moderate"] })) {
    return { error: "Not permitted." };
  }
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return { error: "Comment not found." };
  await prisma.comment.update({ where: { id }, data: { pinned: !comment.pinned } });
  await revalidateArticle(comment.articleId);
  return { pinned: !comment.pinned };
}

export async function toggleCommentReaction(commentId: string) {
  const session = await requireSession();
  const existing = await prisma.commentReaction.findUnique({
    where: { commentId_userId: { commentId, userId: session.user.id } },
  });
  if (existing) {
    await prisma.commentReaction.delete({
      where: { commentId_userId: { commentId, userId: session.user.id } },
    });
  } else {
    await prisma.commentReaction.create({
      data: { commentId, userId: session.user.id },
    });
  }
  const count = await prisma.commentReaction.count({ where: { commentId } });
  return { liked: !existing, count };
}

/** Report a comment, article, or user to the moderation queue. */
export async function reportTarget(
  targetType: "comment" | "article" | "user",
  targetId: string,
  reason: string,
  detail?: string
) {
  const session = await requireSession();
  const recent = await prisma.report.findFirst({
    where: { reporterId: session.user.id, targetType, targetId, status: "open" },
  });
  if (recent) return { error: "You've already reported this — our moderators are on it." };

  await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetType,
      targetId,
      reason,
      detail: detail?.trim() || null,
    },
  });
  revalidatePath("/admin/moderation");
  return { success: true, notice: "Thanks — a moderator will review this." };
}
