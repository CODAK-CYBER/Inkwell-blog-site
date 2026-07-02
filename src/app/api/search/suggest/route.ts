import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/articles";

/** Live title suggestions while typing in the search dialog. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const articles = await prisma.article.findMany({
    where: { ...liveWhere(), title: { contains: q } },
    orderBy: { views: "desc" },
    take: 5,
    select: { title: true, slug: true },
  });

  return NextResponse.json({ suggestions: articles });
}
