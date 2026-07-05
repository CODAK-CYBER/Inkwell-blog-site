import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Security center — admin",
  robots: { index: false },
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function SecurityCenterPage() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) redirect("/admin");

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    twoFactorUsers,
    bannedUsers,
    verifiedUsers,
    activeSessions,
    logins24h,
    recentLogins,
    ipGroups,
    warnings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { twoFactorEnabled: true } }),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.count({ where: { verified: true } }),
    prisma.session.count({ where: { expiresAt: { gt: now } } }),
    prisma.loginEvent.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.loginEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.loginEvent.groupBy({
      by: ["ipAddress"],
      where: { createdAt: { gte: monthAgo }, ipAddress: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { ipAddress: "desc" } },
      take: 8,
    }),
    prisma.userWarning.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const warnedUsers = warnings.length
    ? await prisma.user.findMany({
        where: { id: { in: warnings.map((w) => w.userId) } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userById = new Map(warnedUsers.map((u) => [u.id, u]));

  const twoFactorPct = totalUsers ? Math.round((twoFactorUsers / totalUsers) * 100) : 0;

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <ShieldCheck className="size-5 text-accent" />
        Security center
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Sign-in activity, session posture, and enforcement. Repeated failed sign-ins are
        rate-limited automatically at the auth layer (429s after 5 attempts / 5 min).
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Active sessions" value={activeSessions} />
        <Stat label="Sign-ins (24h)" value={logins24h} />
        <Stat label="2FA adoption" value={`${twoFactorPct}%`} sub={`${twoFactorUsers}/${totalUsers} users`} />
        <Stat label="Banned accounts" value={bannedUsers} />
        <Stat label="Verified users" value={verifiedUsers} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent sign-ins */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Recent sign-ins</h2>
          <ul className="mt-3 divide-y">
            {recentLogins.map((event) => (
              <li key={event.id} className="py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.user.name}</span>
                  <Badge variant="outline" className="capitalize">{event.user.role ?? "user"}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {event.createdAt.toLocaleString()}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {event.ipAddress ?? "IP unknown"} · {event.userAgent ?? "device unknown"}
                </p>
              </li>
            ))}
            {recentLogins.length === 0 && (
              <li className="py-2.5 text-sm text-muted-foreground">No sign-ins recorded yet.</li>
            )}
          </ul>
        </section>

        <div className="space-y-6">
          {/* Top IPs */}
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-serif text-lg font-semibold">Top sign-in IPs (30 days)</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              An unfamiliar IP with many sign-ins across accounts is worth investigating.
            </p>
            <ul className="mt-3 space-y-1.5">
              {ipGroups.map((group) => (
                <li key={group.ipAddress} className="flex items-center justify-between text-sm">
                  <code className="rounded bg-muted px-2 py-0.5 text-xs">{group.ipAddress}</code>
                  <span className="text-muted-foreground">{group._count._all} sign-ins</span>
                </li>
              ))}
              {ipGroups.length === 0 && (
                <li className="text-sm text-muted-foreground">No data yet.</li>
              )}
            </ul>
          </section>

          {/* Warnings */}
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-serif text-lg font-semibold">Recent warnings issued</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Issue warnings from Users → row menu → “Issue warning”.
            </p>
            <ul className="mt-3 divide-y">
              {warnings.map((warning) => {
                const target = userById.get(warning.userId);
                return (
                  <li key={warning.id} className="py-2 text-sm">
                    <span className="font-medium">{target?.name ?? "Deleted user"}</span>{" "}
                    <span className="text-muted-foreground">— {warning.reason}</span>
                    <span className="block text-xs text-muted-foreground">
                      {warning.createdAt.toLocaleString()}
                    </span>
                  </li>
                );
              })}
              {warnings.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">No warnings issued.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
