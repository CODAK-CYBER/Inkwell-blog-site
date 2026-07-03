import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";

/** Asset listing for the editor's media picker. */
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { media: ["upload"] })) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const kind = params.get("kind") ?? undefined;
  const q = params.get("q")?.trim();

  const media = await prisma.media.findMany({
    where: {
      deletedAt: null,
      ...(kind ? { kind } : {}),
      ...(q
        ? {
            OR: [
              { filename: { contains: q } },
              { alt: { contains: q } },
              { tags: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, url: true, filename: true, kind: true, alt: true, width: true, height: true },
  });

  return NextResponse.json({ media });
}
