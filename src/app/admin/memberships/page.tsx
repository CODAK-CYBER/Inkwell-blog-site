import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { PLANS, formatPrice } from "@/lib/monetization";
import { Badge } from "@/components/ui/badge";
import { MembershipRowActions } from "@/components/admin/membership-row-actions";

export const metadata: Metadata = {
  title: "Memberships — admin",
  robots: { index: false },
};

export default async function AdminMembershipsPage() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) redirect("/admin");

  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  const active = subs.filter((s) => s.status === "active");
  const mrrCents = active.reduce((sum, s) => {
    const plan = PLANS.find((p) => p.id === s.plan);
    if (!plan || plan.price === 0) return sum;
    return sum + (plan.interval === "year" ? Math.round(plan.price / 12) : plan.price);
  }, 0);

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <CreditCard className="size-5 text-accent" />
        Memberships
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {active.length} active · MRR {formatPrice(mrrCents)} · payments via Flutterwave (dev checkout when keys are absent)
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Renews</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {subs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No subscriptions yet.
                </td>
              </tr>
            )}
            {subs.map((sub) => (
              <tr key={sub.id}>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{sub.user.name}</p>
                  <p className="text-xs text-muted-foreground">{sub.user.email}</p>
                </td>
                <td className="px-4 py-2.5">{sub.plan}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={sub.status === "active" ? "accent" : "outline"} className="capitalize">
                    {sub.status}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{sub.provider ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {sub.currentPeriodEnd ? sub.currentPeriodEnd.toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <MembershipRowActions userId={sub.user.id} status={sub.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
