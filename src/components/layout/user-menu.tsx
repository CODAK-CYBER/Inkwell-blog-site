"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, LayoutDashboard, LogOut, PenSquare, Settings, Shield, User as UserIcon } from "lucide-react";
import { authClient, signOut, useSession } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (isPending) {
    return <Skeleton className="size-9 rounded-full" />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "accent", size: "sm" }), "hidden md:inline-flex")}
      >
        Sign in
      </Link>
    );
  }

  const user = session.user;
  const isAdmin = user.role === "admin" || user.role === "superadmin";
  const isWriter =
    isAdmin || user.role === "editor" || user.role === "author";
  const initial = (user.name || user.email).charAt(0).toUpperCase();

  const items = [
    ...(isWriter ? [{ label: "Write an article", href: "/write", Icon: PenSquare }] : []),
    { label: "My dashboard", href: "/dashboard", Icon: LayoutDashboard },
    { label: "My profile", href: `/u/${user.username ?? user.id}`, Icon: UserIcon },
    { label: "Saved articles", href: "/saved", Icon: Bookmark },
    { label: "Settings", href: "/settings", Icon: Settings },
    ...(isAdmin ? [{ label: "Admin dashboard", href: "/admin", Icon: Shield }] : []),
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-accent font-medium text-accent-foreground ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name} className="size-full object-cover" />
        ) : (
          initial
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl border bg-popover shadow-lg"
            role="menu"
          >
            <div className="border-b px-4 py-3">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.username ? `@${user.username}` : user.email}
              </p>
            </div>
            <div className="p-1.5">
              {items.map(({ label, href, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                </Link>
              ))}
            </div>
            <div className="border-t p-1.5">
              <button
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  router.push("/");
                  router.refresh();
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
