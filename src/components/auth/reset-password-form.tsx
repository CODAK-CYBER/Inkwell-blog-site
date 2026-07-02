"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/auth/form-field";
import { Spinner } from "@/components/ui/spinner";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  if (tokenError || !token) {
    return (
      <FormError message="This reset link is invalid or has expired. Request a new one from the Forgot Password page." />
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "This link may have expired. Request a new one.");
      return;
    }
    router.push("/login?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters. All other sessions will be signed out."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FormField
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <FormError message={error} />
      <Button type="submit" variant="accent" className="w-full" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : "Reset password"}
      </Button>
    </form>
  );
}
