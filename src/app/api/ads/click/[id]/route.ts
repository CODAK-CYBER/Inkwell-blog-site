import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Click-through tracking → redirect to the advertiser. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = await prisma.ad.findUnique({ where: { id } });
  if (!ad?.targetUrl) {
    return NextResponse.redirect(new URL("/", _request.url));
  }
  prisma.ad.update({ where: { id }, data: { clicks: { increment: 1 } } }).catch(() => {});
  return NextResponse.redirect(ad.targetUrl);
}
