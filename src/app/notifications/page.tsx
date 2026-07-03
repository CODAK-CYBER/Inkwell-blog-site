import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { Container } from "@/components/ui/container";
import { NotificationsPageActions, NotificationRow } from "@/components/notifications/notifications-page";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false },
};

const TYPES = [
  ["all", "All"],
  ["new_article", "New articles"],
  ["breaking", "Breaking"],
  ["reply", "Replies"],
  ["mention", "Mentions"],
  ["follower", "Followers"],
  ["achievement", "Achievements"],
  ["announcement", "Announcements"],
] as const;

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function NotificationsPage({ searchParams }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/notifications");
  const { type = "all" } = await searchParams;

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(type !== "all" ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Container className="max-w-3xl py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Bell className="size-7 text-accent" />
          Notifications
        </h1>
        <NotificationsPageActions hasUnread={unread > 0} />
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {TYPES.map(([value, label]) => (
          <Link
            key={value}
            href={`/notifications${value === "all" ? "" : `?type=${value}`}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              type === value ? "border-accent bg-accent-soft" : "hover:border-accent"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed p-14 text-center text-muted-foreground">
          No notifications here yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={{
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                url: n.url,
                read: n.read,
                priority: n.priority,
                createdAt: n.createdAt.toISOString(),
              }}
            />
          ))}
        </ul>
      )}
    </Container>
  );
}
