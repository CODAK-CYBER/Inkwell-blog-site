"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cancelSubscription, subscribe } from "@/lib/actions/billing";
import { formatPrice, type PlanId } from "@/lib/monetization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year" | null;
  tagline: string;
  features: string[];
}

export function PlanCard({
  plan,
  currentPlan,
  signedIn,
  periodEnd,
}: {
  plan: Plan;
  currentPlan: string;
  signedIn: boolean;
  periodEnd: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const isCurrent = currentPlan === plan.id || (plan.id === "free" && currentPlan === "free");
  const highlight = plan.id === "premium_monthly";

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-6",
        highlight && "border-accent shadow-md",
        isCurrent && "ring-2 ring-accent"
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">{plan.name}</h2>
        {isCurrent && <Badge variant="accent">Current plan</Badge>}
        {highlight && !isCurrent && <Badge variant="secondary">Popular</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
      <p className="mt-4 font-serif text-3xl font-bold">
        {formatPrice(plan.price)}
        {plan.interval && (
          <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
        )}
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
            {feature}
          </li>
        ))}
      </ul>

      {periodEnd && (
        <p className="mt-3 text-xs text-muted-foreground">
          Renews {new Date(periodEnd).toLocaleDateString()}
        </p>
      )}

      <div className="mt-5">
        {plan.id === "free" ? (
          currentPlan !== "free" ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={async () => {
                if (!window.confirm("Cancel your premium membership?")) return;
                setPending(true);
                await cancelSubscription();
                setPending(false);
                router.refresh();
              }}
            >
              {pending ? <Spinner className="size-4" /> : "Downgrade to Free"}
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              Your plan
            </Button>
          )
        ) : isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Active
          </Button>
        ) : (
          <Button
            variant={highlight ? "accent" : "outline"}
            className="w-full"
            disabled={pending}
            onClick={async () => {
              if (!signedIn) {
                router.push("/login?next=/membership");
                return;
              }
              setPending(true);
              const res = await subscribe(plan.id as PlanId);
              if (res && "checkoutUrl" in res && res.checkoutUrl) {
                // Off to Flutterwave's hosted checkout
                window.location.href = res.checkoutUrl;
                return;
              }
              setPending(false);
              if (res?.error) window.alert(res.error);
              router.refresh();
            }}
          >
            {pending ? <Spinner className="size-4" /> : signedIn ? `Get ${plan.name}` : "Sign in to subscribe"}
          </Button>
        )}
      </div>
    </div>
  );
}
