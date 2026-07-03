import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { DigestTrigger } from "@/components/admin/digest-trigger";

export const metadata: Metadata = {
  title: "Communications — admin",
  robots: { index: false },
};

export default async function CommunicationsPage() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) redirect("/admin");

  const [total, unreadCount, byType, digestSubscribers, breakingSubscribers] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { read: false } }),
    prisma.notification.groupBy({ by: ["type"], _count: true, orderBy: { _count: { type: "desc" } } }),
    prisma.notificationPreferences.count({ where: { weeklyDigest: true, emailEnabled: true } }),
    prisma.notificationPreferences.count({ where: { breakingNews: true } }),
  ]);

  const readRate = total > 0 ? Math.round(((total - unreadCount) / total) * 100) : 0;

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Mail className="size-5 text-accent" />
        Communications
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Notification delivery, digests, and engagement.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notifications sent</p>
          <p className="mt-1 font-serif text-2xl font-bold">{total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Read rate</p>
          <p className="mt-1 font-serif text-2xl font-bold">{readRate}%</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Digest subscribers</p>
          <p className="mt-1 font-serif text-2xl font-bold">{digestSubscribers}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Breaking-news opt-ins</p>
          <p className="mt-1 font-serif text-2xl font-bold">{breakingSubscribers}</p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold">By type</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {byType.length === 0 && <p className="text-sm text-muted-foreground">Nothing sent yet.</p>}
          {byType.map((t) => (
            <Badge key={t.type} variant="secondary">
              {t.type.replace(/_/g, " ")}: {t._count}
            </Badge>
          ))}
        </div>
      </section>

      <DigestTrigger subscriberCount={digestSubscribers} />

      <p className="mt-4 text-xs text-muted-foreground">
        Push notifications activate with the PWA in Phase 14. In production, schedule the digest
        via a cron job instead of the manual trigger.
      </p>
    </div>
  );
}
