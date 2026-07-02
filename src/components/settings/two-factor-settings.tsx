"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { SettingsSection } from "@/components/settings/section";
import { FormError, FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

type Stage = "idle" | "password" | "verify" | "disable";

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [stage, setStage] = React.useState<Stage>("idle");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [totpURI, setTotpURI] = React.useState<string | null>(null);
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const secret = totpURI ? new URL(totpURI).searchParams.get("secret") : null;

  async function startEnable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (error || !data) {
      setError(error?.message ?? "Incorrect password.");
      return;
    }
    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
    setStage("verify");
    setPassword("");
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) {
      setError(error.message ?? "Invalid code — check your authenticator app.");
      return;
    }
    setStage("idle");
    setCode("");
    router.refresh();
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (error) {
      setError(error.message ?? "Incorrect password.");
      return;
    }
    setStage("idle");
    setPassword("");
    router.refresh();
  }

  return (
    <SettingsSection
      title="Two-factor authentication"
      description="Adds a 6-digit code from an authenticator app to every sign-in."
    >
      <div className="flex items-center gap-3">
        {enabled ? (
          <>
            <Badge variant="accent" className="gap-1">
              <ShieldCheck className="size-3.5" /> Enabled
            </Badge>
            {stage === "idle" && (
              <Button variant="outline" size="sm" onClick={() => setStage("disable")}>
                Disable
              </Button>
            )}
          </>
        ) : (
          <>
            <Badge variant="outline" className="gap-1">
              <ShieldOff className="size-3.5" /> Disabled
            </Badge>
            {stage === "idle" && (
              <Button variant="accent" size="sm" onClick={() => setStage("password")}>
                Enable 2FA
              </Button>
            )}
          </>
        )}
      </div>

      {stage === "password" && (
        <form onSubmit={startEnable} className="mt-5 max-w-sm space-y-3">
          <FormField
            label="Confirm your password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : "Continue"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStage("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {stage === "verify" && (
        <form onSubmit={confirmEnable} className="mt-5 space-y-4">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-medium">1. Add this key to your authenticator app</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Google Authenticator, 1Password, Authy — choose &quot;enter a setup key&quot;.
            </p>
            <code className="mt-3 block select-all break-all rounded bg-muted px-3 py-2 font-mono text-sm">
              {secret}
            </code>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-medium">2. Save your backup codes</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Each works once if you lose your device. Store them somewhere safe.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm sm:grid-cols-3">
              {backupCodes.map((bc) => (
                <code key={bc} className="rounded bg-muted px-2 py-1">
                  {bc}
                </code>
              ))}
            </div>
          </div>
          <div className="max-w-sm space-y-3">
            <FormField
              label="3. Enter the 6-digit code from the app"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <FormError message={error} />
            <div className="flex gap-2">
              <Button type="submit" variant="accent" size="sm" disabled={pending}>
                {pending ? <Spinner className="size-4" /> : "Verify & enable"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStage("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {stage === "disable" && (
        <form onSubmit={disable} className="mt-5 max-w-sm space-y-3">
          <FormField
            label="Confirm your password to disable 2FA"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : "Disable 2FA"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStage("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </SettingsSection>
  );
}
