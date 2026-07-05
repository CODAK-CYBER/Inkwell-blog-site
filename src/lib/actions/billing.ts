"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { PLANS, type PlanId } from "@/lib/monetization";
import {
  createCheckout,
  flutterwaveConfigured,
  newTxRef,
} from "@/lib/payments/flutterwave";
import { notify } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

/**
 * Payments run through Flutterwave when FLUTTERWAVE_SECRET_KEY is set:
 * these actions return a `checkoutUrl` and fulfillment happens in
 * /api/payments/callback + /api/payments/webhook after verification.
 *
 * Without keys (local dev), the legacy instant "dev checkout" activates
 * immediately so every downstream feature stays testable.
 */

async function refreshSessionCache(name: string) {
  // Role/plan changes must flush the better-auth cookie cache.
  await auth.api.updateUser({ headers: await headers(), body: { name } });
}

export async function subscribe(planId: PlanId) {
  const session = await getServerSession();
  if (!session) return { error: "Sign in to subscribe." };
  const plan = PLANS.find((p) => p.id === planId && p.id !== "free");
  if (!plan) return { error: "Unknown plan." };

  // ---- Live path: Flutterwave hosted checkout ----
  if (flutterwaveConfigured()) {
    try {
      const { link } = await createCheckout({
        txRef: newTxRef("sub", `${session.user.id}-${plan.id}`),
        amountCents: plan.price,
        title: "Inkwell Premium",
        description: `${plan.name} membership`,
        customer: { email: session.user.email, name: session.user.name },
      });
      return { checkoutUrl: link };
    } catch (err) {
      console.error("flutterwave checkout failed:", err);
      return { error: "Couldn't start checkout — please try again in a moment." };
    }
  }

  // ---- Dev fallback: instant activation ----
  const periodEnd = new Date();
  if (plan.interval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId: session.user.id, status: "active" },
      data: { status: "canceled" },
    }),
    prisma.subscription.create({
      data: {
        userId: session.user.id,
        plan: plan.id,
        status: "active",
        provider: "dev",
        currentPeriodEnd: periodEnd,
      },
    }),
  ]);
  if ((session.user.role ?? "user") === "user") {
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "premium" } });
  }
  await refreshSessionCache(session.user.name);
  await notify({
    userIds: [session.user.id],
    type: "announcement",
    title: `Welcome to ${plan.name}! 🎉`,
    body: "Premium articles are unlocked and ads are gone.",
    priority: "high",
  });
  await logActivity({ userId: session.user.id, action: "subscription.started", detail: `${plan.id} (dev)` });

  revalidatePath("/membership");
  return { success: true };
}

export async function cancelSubscription() {
  const session = await getServerSession();
  if (!session) return { error: "Not signed in." };

  await prisma.subscription.updateMany({
    where: { userId: session.user.id, status: "active" },
    data: { status: "canceled" },
  });
  if (session.user.role === "premium") {
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "user" } });
  }
  await refreshSessionCache(session.user.name);
  await logActivity({ userId: session.user.id, action: "subscription.canceled" });

  revalidatePath("/membership");
  return { success: true };
}

export async function donate(
  amountCents: number,
  message?: string,
  guestName?: string,
  guestEmail?: string
) {
  const session = await getServerSession();
  const amount = Math.round(amountCents);
  if (!Number.isFinite(amount) || amount < 100 || amount > 1_000_000) {
    return { error: "Amount must be between $1 and $10,000." };
  }

  // ---- Live path: Flutterwave hosted checkout ----
  if (flutterwaveConfigured()) {
    const email = session?.user.email ?? guestEmail?.trim();
    if (!email) return { error: "Enter your email so we can process the payment." };
    try {
      const { link } = await createCheckout({
        txRef: newTxRef("don"),
        amountCents: amount,
        title: "Support Inkwell",
        description: "One-time contribution",
        customer: {
          email,
          name: session?.user.name ?? guestName?.trim() ?? "Supporter",
        },
        meta: {
          userId: session?.user.id ?? "",
          donorName: session?.user.name ?? guestName?.trim() ?? "",
          message: message?.trim().slice(0, 280) ?? "",
        },
      });
      return { checkoutUrl: link };
    } catch (err) {
      console.error("flutterwave checkout failed:", err);
      return { error: "Couldn't start checkout — please try again in a moment." };
    }
  }

  // ---- Dev fallback: record instantly ----
  await prisma.donation.create({
    data: {
      userId: session?.user.id,
      name: session?.user.name ?? guestName?.trim() ?? "Anonymous",
      amount,
      message: message?.trim().slice(0, 280) || null,
      provider: "dev",
    },
  });
  await logActivity({
    userId: session?.user.id,
    action: "donation.received",
    detail: `$${(amount / 100).toFixed(2)} (dev)`,
  });

  revalidatePath("/admin/revenue");
  return { success: true };
}

/** Admin: comp premium or cancel someone's subscription. */
export async function adminSetSubscription(userId: string, action: "comp" | "cancel") {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) return { error: "Not permitted." };

  if (action === "comp") {
    await prisma.subscription.create({
      data: { userId, plan: "premium_yearly", status: "active", provider: "comp" },
    });
    await prisma.user.updateMany({ where: { id: userId, role: "user" }, data: { role: "premium" } });
    await notify({
      userIds: [userId],
      type: "announcement",
      title: "You've been gifted Premium! 🎁",
      priority: "high",
    });
  } else {
    await prisma.subscription.updateMany({
      where: { userId, status: "active" },
      data: { status: "canceled" },
    });
    await prisma.user.updateMany({ where: { id: userId, role: "premium" }, data: { role: "user" } });
  }
  await logActivity({
    userId: session.user.id,
    action: `subscription.admin_${action}`,
    targetType: "user",
    targetId: userId,
  });
  revalidatePath("/admin/memberships");
  return { success: true };
}
