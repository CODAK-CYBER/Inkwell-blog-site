"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BellNotification {
  id: string;
  type: string;
  title: string;
  url: string | null;
  read: boolean;
  priority: string;
  createdAt: string;
}

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

export function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [items, setItems] = React.useState<BellNotification[]>([]);
  const ref = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unread);
      setItems(data.notifications);
    } catch {
      // silent
    }
  }, []);

  React.useEffect(() => {
    if (!session) return;
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [session, load]);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!session) return null;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border bg-popover shadow-lg"
          >
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <button
                  className="text-xs font-medium text-accent hover:underline"
                  onClick={async () => {
                    await markAllNotificationsRead();
                    load();
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  You&apos;re all caught up. 🎉
                </p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b px-4 py-3 text-left last:border-b-0 hover:bg-secondary",
                      !n.read && "bg-accent-soft/40"
                    )}
                    onClick={async () => {
                      setOpen(false);
                      if (!n.read) markNotificationRead(n.id).then(load);
                      if (n.url) router.push(n.url);
                    }}
                  >
                    <span className="text-base">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm leading-snug", !n.read && "font-medium")}>
                        {n.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </span>
                    {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
                  </button>
                ))
              )}
            </div>
            <Link
              href="/notifications"
              className="block border-t px-4 py-2.5 text-center text-sm font-medium text-accent hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
