"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { FormError, FormField, FormSuccess } from "@/components/auth/form-field";
import { Spinner } from "@/components/ui/spinner";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormError message={error} />
      <FormSuccess
        message={
          sent
            ? "If an account exists for that email, a reset link is on its way. Check your inbox."
            : null
        }
      />
      <Button type="submit" variant="accent" className="w-full" disabled={pending || sent}>
        {pending ? <Spinner className="size-4" /> : "Send reset link"}
      </Button>
    </form>
  );
}
