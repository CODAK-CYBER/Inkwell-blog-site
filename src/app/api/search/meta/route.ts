import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { getTrendingSearches } from "@/lib/trending";

/** Recent (per-user) and trending (global, 7d) searches for the search dialog. */
export async function GET() {
  const session = await getServerSession();

  const [recent, trending] = await Promise.all([
    session
      ? prisma.searchHistory
          .findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 12,
            select: { query: true },
          })
          .then((rows) => [...new Set(rows.map((r) => r.query))].slice(0, 5))
      : Promise.resolve([]),
    getTrendingSearches(6),
  ]);

  return NextResponse.json({ recent, trending });
}
