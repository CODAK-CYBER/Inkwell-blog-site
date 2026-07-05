"use client";

import * as React from "react";
import { donate } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/auth/form-field";
import { cn } from "@/lib/utils";

const PRESETS = [300, 500, 1000, 2500];

export function DonationForm({ signedIn, live }: { signedIn: boolean; live: boolean }) {
  const [amount, setAmount] = React.useState(500);
  const [custom, setCustom] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (done) {
    return (
      <div className="mt-8 rounded-xl border border-accent/40 bg-accent-soft/50 p-8">
        <p className="font-serif text-xl font-bold">Thank you! 💛</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your support means the world to independent writers.
        </p>
      </div>
    );
  }

  const effective = custom ? Math.round(Number(custom) * 100) : amount;

  return (
    <form
      className="mt-8 rounded-xl border bg-card p-6 text-left"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const res = await donate(
          effective,
          message,
          signedIn ? undefined : name,
          signedIn ? undefined : email
        );
        if (res && "checkoutUrl" in res && res.checkoutUrl) {
          window.location.href = res.checkoutUrl; // Flutterwave hosted checkout
          return;
        }
        setPending(false);
        if (res?.error) {
          setError(res.error);
          return;
        }
        setDone(true);
      }}
    >
      <p className="text-sm font-semibold">Choose an amount</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={amount === preset && !custom}
            onClick={() => {
              setAmount(preset);
              setCustom("");
            }}
            className={cn(
              "rounded-lg border py-2 text-sm font-medium transition-all",
              amount === preset && !custom
                ? "border-accent bg-accent-soft"
                : "hover:border-muted-foreground/40"
            )}
          >
            ${preset / 100}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-3">
        <Input
          type="number"
          min={1}
          max={10000}
          step="0.01"
          placeholder="Custom amount (USD)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="h-9"
        />
        {!signedIn && (
          <>
            <Input
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
            <Input
              type="email"
              placeholder={live ? "Your email (required for payment)" : "Your email (optional)"}
              required={live}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
            />
          </>
        )}
        <Input
          placeholder="Leave a message (optional)"
          maxLength={280}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-9"
        />
      </div>
      <FormError message={error} />
      <Button type="submit" variant="accent" className="mt-4 w-full" disabled={pending || effective < 100}>
        {pending ? <Spinner className="size-4" /> : `Contribute $${(effective / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}
