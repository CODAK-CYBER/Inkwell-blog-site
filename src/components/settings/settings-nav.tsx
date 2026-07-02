"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, KeyRound, Shield, User, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Profile", href: "/settings", Icon: User },
  { label: "Interests", href: "/settings/interests", Icon: Heart },
  { label: "Account", href: "/settings/account", Icon: UserCog },
  { label: "Security", href: "/settings/security", Icon: KeyRound },
  { label: "Notifications", href: "/settings/notifications", Icon: Bell },
  { label: "Privacy & data", href: "/settings/privacy", Icon: Shield },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Settings sections"
      className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
    >
      {items.map(({ label, href, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
