"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Laptop, Smartphone } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { SettingsSection } from "@/components/settings/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SessionRow {
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  current: boolean;
}

function describeDevice(userAgent: string | null) {
  if (!userAgent) return { label: "Unknown device", mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const browser =
    userAgent.match(/(Edg|Chrome|Firefox|Safari|Opera)/)?.[1]?.replace("Edg", "Edge") ??
    "Browser";
  const os =
    userAgent.match(/\(([^;)]+)/)?.[1]?.trim().replace("Windows NT 10.0", "Windows") ??
    "Unknown OS";
  return { label: `${browser} on ${os}`, mobile };
}

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  async function revoke(token: string) {
    setPending(token);
    await authClient.revokeSession({ token });
    setPending(null);
    router.refresh();
  }

  async function revokeOthers() {
    setPending("others");
    await authClient.revokeOtherSessions();
    setPending(null);
    router.refresh();
  }

  return (
    <SettingsSection
      title="Active sessions"
      description="Devices currently signed in to your account."
    >
      <ul className="divide-y">
        {sessions.map((s) => {
          const device = describeDevice(s.userAgent);
          const Icon = device.mobile ? Smartphone : Laptop;
          return (
            <li key={s.token} className="flex items-center gap-3 py-3">
              <span className="rounded-md bg-secondary p-2">
                <Icon className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {device.label}
                  {s.current && <Badge variant="accent">This device</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.ipAddress || "IP unknown"} · signed in{" "}
                  {new Date(s.createdAt).toLocaleString()}
                </p>
              </div>
              {!s.current && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending !== null}
                  onClick={() => revoke(s.token)}
                >
                  {pending === s.token ? "Revoking…" : "Revoke"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {sessions.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={pending !== null}
          onClick={revokeOthers}
        >
          Sign out all other devices
        </Button>
      )}
    </SettingsSection>
  );
}
