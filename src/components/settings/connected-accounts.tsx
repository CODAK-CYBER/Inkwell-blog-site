"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { SocialProvider } from "@/lib/social-providers";
import { SettingsSection } from "@/components/settings/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  credential: "Email & password",
};

export function ConnectedAccounts({
  connected,
  available,
}: {
  connected: string[];
  available: SocialProvider[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  const rows = [
    ...connected.map((p) => ({ provider: p, isConnected: true })),
    ...available
      .filter((p) => !connected.includes(p))
      .map((p) => ({ provider: p, isConnected: false })),
  ];

  if (rows.length === 0) return null;

  return (
    <SettingsSection
      title="Connected accounts"
      description="Sign-in methods linked to your account."
    >
      <ul className="divide-y">
        {rows.map(({ provider, isConnected }) => (
          <li key={provider} className="flex items-center justify-between py-3">
            <span className="text-sm font-medium">{LABELS[provider] ?? provider}</span>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="accent">Connected</Badge>
                {provider !== "credential" && connected.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending !== null}
                    onClick={async () => {
                      setPending(provider);
                      await authClient.unlinkAccount({ providerId: provider });
                      setPending(null);
                      router.refresh();
                    }}
                  >
                    {pending === provider ? "…" : "Unlink"}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending !== null}
                onClick={async () => {
                  setPending(provider);
                  await authClient.linkSocial({
                    provider: provider as SocialProvider,
                    callbackURL: "/settings/privacy",
                  });
                  setPending(null);
                }}
              >
                Connect
              </Button>
            )}
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
