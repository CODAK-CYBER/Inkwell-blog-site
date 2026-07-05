import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { PLANS, formatPrice } from "@/lib/monetization";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Revenue — admin",
  robots: { index: false },
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function AdminRevenuePage() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) redirect("/admin");

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [activeSubs, donations, donations30d, ads, affiliates, totalUsers] = await Promise.all([
    prisma.subscription.findMany({ where: { status: "active" } }),
    prisma.donation.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.donation.findMany({
      where: { createdAt: { gte: monthAgo } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.ad.findMany({ orderBy: { impressions: "desc" } }),
    prisma.affiliateLink.findMany({ orderBy: { clicks: "desc" }, take: 10 }),
    prisma.user.count(),
  ]);

  const mrrCents = activeSubs.reduce((sum, s) => {
    const plan = PLANS.find((p) => p.id === s.plan);
    if (!plan || plan.price === 0) return sum;
    return sum + (plan.interval === "year" ? Math.round(plan.price / 12) : plan.price);
  }, 0);
  const arpuCents = totalUsers > 0 ? Math.round(mrrCents / totalUsers) : 0;
  const conversion = totalUsers > 0 ? ((activeSubs.length / totalUsers) * 100).toFixed(1) : "0";
  const byPlan = new Map<string, number>();
  for (const sub of activeSubs) byPlan.set(sub.plan, (byPlan.get(sub.plan) ?? 0) + 1);

  const adImpressions = ads.reduce((s, a) => s + a.impressions, 0);
  const adClicks = ads.reduce((s, a) => s + a.clicks, 0);
  const affiliateClicks = affiliates.reduce((s, a) => s + a.clicks, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Wallet className="size-5 text-accent" />
          Revenue
        </h1>
        <div className="flex gap-2">
          <a href="/api/admin/export?dataset=revenue" download className={buttonVariants({ variant: "outline", size: "sm" })}>
            Export CSV
          </a>
          <Link href="/admin/memberships" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Memberships
          </Link>
          <Link href="/admin/ads" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ads
          </Link>
        </div>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Payments via Flutterwave when keys are configured; otherwise dev-mode checkout
        records figures without charging.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="MRR" value={formatPrice(mrrCents)} sub={`${activeSubs.length} active member(s)`} />
        <Stat label="ARPU" value={formatPrice(arpuCents)} sub={`${totalUsers} total users`} />
        <Stat label="Member conversion" value={`${conversion}%`} />
        <Stat
          label="Donations (all time)"
          value={formatPrice(donations._sum.amount ?? 0)}
          sub={`${donations._count} contribution(s)`}
        />
        <Stat
          label="Ad performance"
          value={`${adClicks} clicks`}
          sub={`${adImpressions.toLocaleString()} impressions${adImpressions ? ` · ${((adClicks / adImpressions) * 100).toFixed(1)}% CTR` : ""}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Memberships by plan */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Active memberships by plan</h2>
          <ul className="mt-3 space-y-2">
            {[...byPlan.entries()].map(([plan, count]) => (
              <li key={plan} className="flex items-center justify-between text-sm">
                <span>{plan}</span>
                <Badge variant="secondary">{count}</Badge>
              </li>
            ))}
            {byPlan.size === 0 && <li className="text-sm text-muted-foreground">No active memberships yet.</li>}
          </ul>
        </section>

        {/* Recent donations */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Recent donations (30 days)</h2>
          <ul className="mt-3 divide-y">
            {donations30d.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{d.name ?? "Anonymous"}</span>
                  {d.message && <span className="text-muted-foreground"> — “{d.message}”</span>}
                </span>
                <span className="shrink-0 font-medium">{formatPrice(d.amount)}</span>
              </li>
            ))}
            {donations30d.length === 0 && (
              <li className="py-2 text-sm text-muted-foreground">No donations in the last 30 days.</li>
            )}
          </ul>
        </section>

        {/* Ads */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Ads</h2>
          <ul className="mt-3 divide-y">
            {ads.map((ad) => (
              <li key={ad.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{ad.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {ad.impressions.toLocaleString()} views · {ad.clicks} clicks
                </span>
              </li>
            ))}
            {ads.length === 0 && <li className="py-2 text-sm text-muted-foreground">No ads yet.</li>}
          </ul>
        </section>

        {/* Affiliates */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-lg font-semibold">Top affiliate links</h2>
          <ul className="mt-3 divide-y">
            {affiliates.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {link.name} <code className="text-xs text-muted-foreground">/go/{link.code}</code>
                </span>
                <Badge variant="secondary">{link.clicks} clicks</Badge>
              </li>
            ))}
            {affiliates.length === 0 && (
              <li className="py-2 text-sm text-muted-foreground">
                No affiliate links yet — total {affiliateClicks} clicks tracked.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
