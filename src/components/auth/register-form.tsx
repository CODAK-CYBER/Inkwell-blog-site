"use client";

import * as React from "react";
import { signUp } from "@/lib/auth-client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/auth/form-field";
import { Spinner } from "@/components/ui/spinner";
import { MailCheck } from "lucide-react";

export function RegisterForm() {
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [usernameTouched, setUsernameTouched] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    const { error } = await signUp.email({
      name,
      username,
      email,
      password,
      callbackURL: "/onboarding", // where the verification link lands
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="rounded-full bg-accent-soft p-3 text-accent">
          <MailCheck className="size-7" />
        </span>
        <h2 className="mt-4 font-serif text-lg font-semibold">Check your inbox</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
          Click it to activate your account and start onboarding.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField
        label="Full name"
        name="name"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!usernameTouched) setUsername(slugify(e.target.value));
        }}
      />
      <FormField
        label="Username"
        name="username"
        autoComplete="username"
        required
        minLength={3}
        maxLength={30}
        pattern="[a-zA-Z0-9_.-]+"
        hint="Letters, numbers, dots, dashes and underscores only."
        value={username}
        onChange={(e) => {
          setUsernameTouched(true);
          setUsername(e.target.value);
        }}
      />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FormField
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      <FormError message={error} />

      <Button type="submit" variant="accent" className="w-full" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : "Create account"}
      </Button>
    </form>
  );
}
