"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck, Trash2, X } from "lucide-react";
import {
  clearReadNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_EMOJI: Record<string, string> = {
  new_article: "📰",
  breaking: "🔴",
  reply: "💬",
  mention: "👋",
  follower: "➕",
  achievement: "🏆",
  announcement: "📣",
  security: "🔐",
};

export function NotificationsPageActions({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <div className="flex gap-2">
      {hasUnread && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await markAllNotificationsRead();
            setPending(false);
            router.refresh();
          }}
        >
          <CheckCheck />
          Mark all read
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await clearReadNotifications();
          setPending(false);
          router.refresh();
        }}
      >
        <Trash2 />
        Clear read
      </Button>
    </div>
  );
}

export function NotificationRow({
  notification,
}: {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    url: string | null;
    read: boolean;
    priority: string;
    createdAt: string;
  };
}) {
  const router = useRouter();
  const n = notification;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-4",
        !n.read && "border-accent/40 bg-accent-soft/30"
      )}
    >
      <span className="text-xl">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {n.url ? (
            <Link
              href={n.url}
              className={cn("text-sm hover:text-accent", !n.read && "font-semibold")}
              onClick={() => {
                if (!n.read) markNotificationRead(n.id);
              }}
            >
              {n.title}
            </Link>
          ) : (
            <span className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</span>
          )}
          {n.priority === "critical" && <Badge variant="outline" className="border-destructive/60 text-destructive">Critical</Badge>}
          {n.priority === "high" && <Badge variant="accent">Important</Badge>}
        </div>
        {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {!n.read && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mark read"
            onClick={async () => {
              await markNotificationRead(n.id);
              router.refresh();
            }}
          >
            <CheckCheck />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete notification"
          onClick={async () => {
            await deleteNotification(n.id);
            router.refresh();
          }}
        >
          <X />
        </Button>
      </div>
    </li>
  );
}
