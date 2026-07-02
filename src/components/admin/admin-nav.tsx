"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CreditCard,
  Database,
  FileText,
  Flag,
  FolderTree,
  Image,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Megaphone,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups: Array<{
  title: string;
  items: Array<{
    label: string;
    href?: string;
    Icon: React.ComponentType<{ className?: string }>;
    phase?: number; // set = not built yet
    adminOnly?: boolean;
  }>;
}> = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", Icon: LayoutDashboard },
      { label: "Activity logs", href: "/admin/activity", Icon: Activity },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Articles", href: "/admin/articles", Icon: FileText },
      { label: "Categories", href: "/admin/categories", Icon: FolderTree },
      { label: "Tags", href: "/admin/tags", Icon: Tags },
      { label: "Comments", Icon: MessageSquare, phase: 7 },
      { label: "Media library", Icon: Image, phase: 4 },
      { label: "Homepage manager", Icon: LayoutTemplate, phase: 5 },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Users & roles", href: "/admin/users", Icon: Users, adminOnly: true },
      { label: "Memberships", Icon: CreditCard, phase: 10 },
    ],
  },
  {
    title: "Growth",
    items: [
      { label: "Newsletter", Icon: Mail, phase: 8 },
      { label: "Notifications", Icon: Bell, phase: 8 },
      { label: "Advertisements", Icon: Megaphone, phase: 10 },
      { label: "SEO", Icon: Search, phase: 12 },
      { label: "Analytics", Icon: BarChart3, phase: 11 },
      { label: "Revenue", Icon: Wallet, phase: 10 },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Security center", Icon: Shield, phase: 13 },
      { label: "Settings", Icon: Settings, phase: 13 },
      { label: "Backups", Icon: Database, phase: 13 },
      { label: "AI tools", Icon: Bot, phase: 13 },
      { label: "API & webhooks", Icon: KeyRound, phase: 13 },
      { label: "Feature flags", Icon: Flag, phase: 13 },
    ],
  },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </p>
          <div className="mt-2 space-y-0.5">
            {group.items
              .filter((item) => !item.adminOnly || isAdmin)
              .map(({ label, href, Icon, phase }) => {
                if (!href) {
                  return (
                    <span
                      key={label}
                      title={`Arrives in Phase ${phase}`}
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground/50"
                    >
                      <Icon className="size-4" />
                      {label}
                      <span className="ml-auto rounded border px-1 text-[10px] text-muted-foreground/60">
                        P{phase}
                      </span>
                    </span>
                  );
                }
                const active =
                  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
          </div>
        </div>
      ))}
    </nav>
  );
}
