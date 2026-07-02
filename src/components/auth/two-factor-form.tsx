"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/auth/form-field";
import { Spinner } from "@/components/ui/spinner";

export function TwoFactorForm() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [useBackup, setUseBackup] = React.useState(false);
  const [trustDevice, setTrustDevice] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice });
    setPending(false);
    if (error) {
      setError(error.message ?? "Invalid code. Try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField
        label={useBackup ? "Backup code" : "Authentication code"}
        name="code"
        inputMode={useBackup ? "text" : "numeric"}
        autoComplete="one-time-code"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="text-center font-mono text-lg tracking-[0.4em]"
      />
      {!useBackup && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Trust this device for 60 days
        </label>
      )}
      <FormError message={error} />
      <Button type="submit" variant="accent" className="w-full" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : "Verify"}
      </Button>
      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          setUseBackup((v) => !v);
          setCode("");
          setError(null);
        }}
      >
        {useBackup ? "Use authenticator code instead" : "Use a backup code instead"}
      </button>
    </form>
  );
}
