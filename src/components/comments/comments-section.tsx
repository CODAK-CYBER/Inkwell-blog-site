import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { CommentsList, type CommentNode } from "@/components/comments/comments-list";

/**
 * Server wrapper: loads the visible comment tree for an article and
 * hands it to the interactive client list.
 */
export async function CommentsSection({
  articleId,
  session,
}: {
  articleId: string;
  session: { user: { id: string; role?: string | null; name: string } } | null;
}) {
  const canModerate = hasPermission(session?.user.role, { comment: ["moderate"] });

  const rows = await prisma.comment.findMany({
    where: {
      articleId,
      // Moderators also see flagged/hidden comments inline
      ...(canModerate ? {} : { status: "visible" }),
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, username: true, image: true, role: true, verified: true } },
      _count: { select: { reactions: true } },
      reactions: session ? { where: { userId: session.user.id }, select: { userId: true } } : false,
    },
  });

  // Flat rows → nested tree
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      content: row.content,
      status: row.status,
      pinned: row.pinned,
      isOfficial: row.isOfficial,
      editedAt: row.editedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      author: {
        id: row.user.id,
        name: row.user.name,
        username: row.user.username,
        image: row.user.image,
        role: row.user.role ?? "user",
        verified: row.user.verified,
      },
      likeCount: row._count.reactions,
      likedByMe: Array.isArray(row.reactions) && row.reactions.length > 0,
      replies: [],
    });
  }
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  // Pinned first at the top level
  roots.sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <CommentsList
      articleId={articleId}
      initialComments={roots}
      viewer={
        session
          ? { id: session.user.id, name: session.user.name, canModerate }
          : null
      }
    />
  );
}
