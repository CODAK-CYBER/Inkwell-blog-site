import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { getServerSession } from "@/lib/session";
import { siteConfig } from "@/lib/site";
import { flutterwaveConfigured } from "@/lib/payments/flutterwave";
import { Container } from "@/components/ui/container";
import { DonationForm } from "@/components/membership/donation-form";

export const metadata: Metadata = {
  title: "Support us",
  description: `Support independent publishing on ${siteConfig.name}.`,
};

interface Props {
  searchParams: Promise<{ success?: string; canceled?: string; failed?: string }>;
}

export default async function SupportPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getServerSession();
  const live = flutterwaveConfigured();

  return (
    <Container className="max-w-xl py-14 text-center">
      <h1 className="flex items-center justify-center gap-2 text-3xl font-bold sm:text-4xl">
        <HeartHandshake className="size-8 text-accent" />
        Support {siteConfig.name}
      </h1>
      <p className="mt-3 text-muted-foreground">
        Independent publishing runs on readers like you. A one-time contribution keeps the
        stories coming — no strings attached.
      </p>
      {params.success && (
        <p className="mx-auto mt-4 rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm font-medium">
          💛 Payment received — thank you for supporting independent publishing!
        </p>
      )}
      {params.canceled && (
        <p className="mx-auto mt-4 rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Checkout canceled — no charge was made.
        </p>
      )}
      {params.failed && (
        <p className="mx-auto mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          We couldn&apos;t verify that payment. If you were charged, contact support.
        </p>
      )}
      <DonationForm signedIn={Boolean(session)} live={live} />
      <p className="mt-6 text-xs text-muted-foreground">
        Prefer ongoing support? <a href="/membership" className="text-accent hover:underline">Become a member</a>.
        <br />
        {live
          ? "🔒 Payments are processed securely by Flutterwave."
          : "⚠️ Dev mode: contributions are recorded without charging until Flutterwave keys are added."}
      </p>
    </Container>
  );
}
