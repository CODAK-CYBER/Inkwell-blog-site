import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

/** Admin CSV exports: ?dataset=users | activity | revenue */
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  const dataset = request.nextUrl.searchParams.get("dataset") ?? "users";
  let rows: Array<Record<string, unknown>> = [];

  if (dataset === "users") {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    rows = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username ?? "",
      role: u.role ?? "user",
      verified: u.verified,
      banned: u.banned ?? false,
      emailVerified: u.emailVerified,
      twoFactor: u.twoFactorEnabled ?? false,
      createdAt: u.createdAt.toISOString(),
    }));
  } else if (dataset === "activity") {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: { user: { select: { email: true } } },
    });
    rows = logs.map((l) => ({
      when: l.createdAt.toISOString(),
      who: l.user?.email ?? "system",
      action: l.action,
      targetType: l.targetType ?? "",
      detail: l.detail ?? "",
    }));
  } else if (dataset === "revenue") {
    const [subs, donations] = await Promise.all([
      prisma.subscription.findMany({ include: { user: { select: { email: true } } } }),
      prisma.donation.findMany(),
    ]);
    rows = [
      ...subs.map((s) => ({
        type: "subscription",
        who: s.user.email,
        plan: s.plan,
        status: s.status,
        amountUsd: "",
        createdAt: s.createdAt.toISOString(),
      })),
      ...donations.map((d) => ({
        type: "donation",
        who: d.name ?? d.userId ?? "anonymous",
        plan: "",
        status: d.provider,
        amountUsd: (d.amount / 100).toFixed(2),
        createdAt: d.createdAt.toISOString(),
      })),
    ];
  } else {
    return NextResponse.json({ error: "Unknown dataset" }, { status: 400 });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dataset}-export.csv"`,
    },
  });
}
