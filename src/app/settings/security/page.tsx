import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";
import { SessionsList } from "@/components/settings/sessions-list";
import { LoginHistory } from "@/components/settings/login-history";

export const metadata: Metadata = {
  title: "Security settings",
  robots: { index: false },
};

export default async function SecuritySettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/settings/security");

  const [sessions, loginEvents] = await Promise.all([
    auth.api.listSessions({ headers: await headers() }),
    prisma.loginEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <div className="space-y-6">
      <TwoFactorSettings enabled={Boolean(session.user.twoFactorEnabled)} />
      <SessionsList
        sessions={sessions.map((s) => ({
          token: s.token,
          ipAddress: s.ipAddress ?? null,
          userAgent: s.userAgent ?? null,
          createdAt: s.createdAt.toISOString(),
          current: s.token === session.session.token,
        }))}
      />
      <LoginHistory
        events={loginEvents.map((e) => ({
          id: e.id,
          ipAddress: e.ipAddress,
          userAgent: e.userAgent,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
