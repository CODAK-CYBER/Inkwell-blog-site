"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { FormError, FormField, FormSuccess } from "@/components/auth/form-field";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [needsVerification, setNeedsVerification] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setNeedsVerification(false);
    setPending(true);

    // Accept either email or username in one field.
    const isEmail = identifier.includes("@");
    const { error } = isEmail
      ? await signIn.email({ email: identifier, password, rememberMe })
      : await signIn.username({ username: identifier, password, rememberMe });

    setPending(false);

    if (error) {
      if (error.status === 403) {
        setNeedsVerification(true);
        setError("Your email isn't verified yet. Check your inbox for the verification link.");
      } else if (error.status === 429) {
        setError("Too many attempts. Your account is temporarily locked — try again in a few minutes.");
      } else {
        setError(error.message ?? "Invalid credentials.");
      }
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function resendVerification() {
    if (!identifier.includes("@")) {
      setError("Enter your email address above, then try again.");
      return;
    }
    await authClient.sendVerificationEmail({ email: identifier, callbackURL: "/onboarding" });
    setInfo("Verification email sent — check your inbox.");
    setError(null);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField
        label="Email or username"
        name="identifier"
        autoComplete="username"
        required
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Remember me
        </label>
        <Link href="/forgot-password" className="text-sm font-medium text-accent hover:underline">
          Forgot password?
        </Link>
      </div>

      <FormError message={error} />
      <FormSuccess message={info} />
      {needsVerification && (
        <Button type="button" variant="outline" className="w-full" onClick={resendVerification}>
          Resend verification email
        </Button>
      )}

      <Button type="submit" variant="accent" className="w-full" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : "Sign in"}
      </Button>
    </form>
  );
}
