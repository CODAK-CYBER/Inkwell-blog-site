import { prisma } from "@/lib/prisma";

/** Membership plans. Prices in USD cents. */
export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: null as "month" | "year" | null,
    tagline: "Everything you need to read",
    features: ["All standard articles", "Comments & reactions", "Reading lists & history", "Weekly digest"],
  },
  {
    id: "premium_monthly",
    name: "Premium",
    price: 500,
    interval: "month" as const,
    tagline: "The full experience, monthly",
    features: ["Everything in Free", "Exclusive premium articles", "Completely ad-free", "Premium badge", "Early access to features"],
  },
  {
    id: "premium_yearly",
    name: "Premium Yearly",
    price: 5000,
    interval: "year" as const,
    tagline: "Two months free",
    features: ["Everything in Premium", "2 months free vs monthly", "Locked-in price"],
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

const PREMIUM_ROLES = ["premium", "author", "editor", "admin", "superadmin", "moderator"];

/** Premium access = staff/author role, premium role, or an active subscription. */
export async function hasPremiumAccess(
  userId: string | undefined,
  role: string | null | undefined
): Promise<boolean> {
  if (!userId) return false;
  if (role && PREMIUM_ROLES.includes(role)) return true;
  const sub = await getActiveSubscription(userId);
  return Boolean(sub);
}

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: "active",
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
}
