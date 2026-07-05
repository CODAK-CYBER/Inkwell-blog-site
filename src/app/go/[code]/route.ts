import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Cloaked affiliate links: /go/{code} → target, click-tracked. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = await prisma.affiliateLink.findUnique({ where: { code } });
  if (!link) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  prisma.affiliateLink
    .update({ where: { id: link.id }, data: { clicks: { increment: 1 } } })
    .catch(() => {});
  return NextResponse.redirect(link.targetUrl);
}
