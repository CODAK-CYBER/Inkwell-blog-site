"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { triggerWeeklyDigest } from "@/lib/actions/moderation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormSuccess } from "@/components/auth/form-field";

export function DigestTrigger({ subscriberCount }: { subscriberCount: number }) {
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  return (
    <section className="mt-6 rounded-xl border bg-card p-5">
      <h2 className="font-serif text-lg font-semibold">Weekly digest</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Emails each subscriber the week&apos;s top articles from their interests.
        {subscriberCount > 0 && ` ${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"} will receive it.`}
      </p>
      <div className="mt-3">
        <Button
          variant="accent"
          size="sm"
          disabled={pending || subscriberCount === 0}
          onClick={async () => {
            if (!window.confirm(`Send the weekly digest to ${subscriberCount} subscriber(s) now?`)) return;
            setPending(true);
            setResult(null);
            const res = await triggerWeeklyDigest();
            setPending(false);
            setResult(
              "sent" in res
                ? `Digest sent to ${res.sent} subscriber(s)${res.skipped ? ` (${res.skipped} skipped)` : ""}.`
                : "Something went wrong."
            );
          }}
        >
          {pending ? <Spinner className="size-4" /> : <Send />}
          Send weekly digest now
        </Button>
      </div>
      <FormSuccess message={result} />
    </section>
  );
}
