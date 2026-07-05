import type { Metadata } from "next";
import { Crown } from "lucide-react";
import { getServerSession } from "@/lib/session";
import { getActiveSubscription, PLANS } from "@/lib/monetization";
import { flutterwaveConfigured } from "@/lib/payments/flutterwave";
import { Container } from "@/components/ui/container";
import { PlanCard } from "@/components/membership/plan-card";

export const metadata: Metadata = {
  title: "Membership",
  description: "Go premium: exclusive articles, ad-free reading, and more.",
};

interface Props {
  searchParams: Promise<{ success?: string; canceled?: string; failed?: string }>;
}

export default async function MembershipPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getServerSession();
  const live = flutterwaveConfigured();
  const activeSub = session ? await getActiveSubscription(session.user.id) : null;
  const currentPlan = activeSub?.plan ?? "free";
  const role = session?.user.role ?? "user";
  const staffAccess = ["author", "editor", "admin", "superadmin", "moderator"].includes(role);

  return (
    <Container className="py-14">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold sm:text-4xl">
          <Crown className="size-8 text-accent" />
          Membership
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Support independent publishing and unlock the full experience — exclusive
          articles, completely ad-free.
        </p>
        {staffAccess && (
          <p className="mx-auto mt-3 max-w-md rounded-md bg-accent-soft px-3 py-2 text-sm">
            Your {role} role already includes full premium access.
          </p>
        )}
        {params.success && (
          <p className="mx-auto mt-3 max-w-md rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm font-medium">
            🎉 Payment confirmed — welcome to Premium! Your membership is active.
          </p>
        )}
        {params.canceled && (
          <p className="mx-auto mt-3 max-w-md rounded-md border px-3 py-2 text-sm text-muted-foreground">
            Checkout canceled — no charge was made.
          </p>
        )}
        {params.failed && (
          <p className="mx-auto mt-3 max-w-md rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            We couldn&apos;t verify that payment. If you were charged, contact support — nothing
            is lost, the webhook will also retry fulfillment.
          </p>
        )}
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={{ ...plan, features: [...plan.features] }}
            currentPlan={currentPlan}
            signedIn={Boolean(session)}
            periodEnd={activeSub?.plan === plan.id ? activeSub.currentPeriodEnd?.toISOString() ?? null : null}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        {live
          ? "🔒 Payments are processed securely by Flutterwave (cards, bank transfer, USSD, mobile money)."
          : "⚠️ Dev mode: checkout activates instantly without charging. Add your Flutterwave keys to .env to go live."}
      </p>
    </Container>
  );
}
