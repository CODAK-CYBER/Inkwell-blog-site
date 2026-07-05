"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban, BadgeCheck, MoreHorizontal, ShieldCheck, StickyNote, Undo2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { addUserNote, issueWarning, setUserVerified } from "@/lib/actions/moderation";
import { ROLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  emailVerified: boolean;
  verified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  loginCount: number;
  activeSessions: number;
}

export function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setOpen(false);
    try {
      await fn();
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  async function changeRole(role: string) {
    await run(() =>
      authClient.admin.setRole({ userId: user.id, role: role as "user" })
    );
  }

  async function banUser() {
    const reason = window.prompt("Ban reason (shown in the admin panel):", "Violation of terms");
    if (reason === null) return;
    await run(() => authClient.admin.banUser({ userId: user.id, banReason: reason }));
  }

  async function unbanUser() {
    await run(() => authClient.admin.unbanUser({ userId: user.id }));
  }

  async function revokeSessions() {
    await run(() => authClient.admin.revokeUserSessions({ userId: user.id }));
  }

  return (
    <tr className={user.banned ? "bg-destructive/5" : undefined}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="size-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium">
              {user.username ? (
                <Link href={`/u/${user.username}`} className="hover:text-accent">
                  {user.name}
                </Link>
              ) : (
                user.name
              )}
              {user.verified && (
                <BadgeCheck className="size-3.5 shrink-0 text-accent" aria-label="Verified user" />
              )}
              {user.twoFactorEnabled && (
                <ShieldCheck className="size-3.5 shrink-0 text-accent" aria-label="2FA enabled" />
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <Badge variant="secondary" className="capitalize">{user.role}</Badge>
        ) : (
          <select
            value={user.role}
            disabled={pending}
            onChange={(e) => changeRole(e.target.value)}
            className="rounded-md border border-input bg-transparent px-2 py-1 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Role for ${user.name}`}
          >
            {ROLES.map((role) => (
              <option key={role} value={role} className="capitalize">
                {role}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {user.banned ? (
            <Badge variant="outline" className="w-fit border-destructive/50 text-destructive">
              Banned{user.banReason ? `: ${user.banReason}` : ""}
            </Badge>
          ) : user.emailVerified ? (
            <Badge variant="accent" className="w-fit">Verified</Badge>
          ) : (
            <Badge variant="outline" className="w-fit">Unverified</Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {user.loginCount} <span className="text-xs">({user.activeSessions} active)</span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        {!isSelf && (
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              aria-label={`Actions for ${user.name}`}
              onClick={() => setOpen((v) => !v)}
            >
              <MoreHorizontal />
            </Button>
            {open && (
              <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border bg-popover p-1 shadow-lg">
                {user.banned ? (
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary"
                    onClick={unbanUser}
                  >
                    <Undo2 className="size-4" />
                    Unban user
                  </button>
                ) : (
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    onClick={banUser}
                  >
                    <Ban className="size-4" />
                    Ban user
                  </button>
                )}
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary"
                  onClick={() => run(() => setUserVerified(user.id, !user.verified))}
                >
                  <BadgeCheck className="size-4" />
                  {user.verified ? "Remove verification" : "Verify user"}
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary"
                  onClick={() => {
                    const reason = window.prompt("Warning reason (the user will be notified):");
                    if (reason) run(() => issueWarning(user.id, reason));
                  }}
                >
                  <AlertTriangle className="size-4" />
                  Issue warning
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary"
                  onClick={() => {
                    const note = window.prompt("Internal note (staff-only, never shown to the user):");
                    if (note) run(() => addUserNote(user.id, note));
                  }}
                >
                  <StickyNote className="size-4" />
                  Add internal note
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary"
                  onClick={revokeSessions}
                >
                  <Undo2 className="size-4 rotate-90" />
                  Revoke all sessions
                </button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
