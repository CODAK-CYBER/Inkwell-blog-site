import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/monetization";
import { notify } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

/**
 * Flutterwave integration (https://developer.flutterwave.com).
 *
 * Flow: create a hosted-checkout link → customer pays on Flutterwave →
 * they return via /api/payments/callback AND Flutterwave fires the
 * /api/payments/webhook. Both paths verify the transaction against the
 * Flutterwave API and run the same idempotent fulfillment, so payment
 * is honored even if the customer closes the tab before redirecting.
 *
 * Without FLUTTERWAVE_SECRET_KEY the platform falls back to the instant
 * dev checkout in src/lib/actions/billing.ts.
 */

const API = "https://api.flutterwave.com/v3";

export const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || "USD";

export function flutterwaveConfigured() {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

export function newTxRef(kind: "sub" | "don", suffix = "") {
  const rand = crypto.randomBytes(4).toString("hex");
  return `${kind}-${suffix}${suffix ? "-" : ""}${Date.now()}-${rand}`;
}

export interface CheckoutInput {
  txRef: string;
  amountCents: number;
  title: string;
  description: string;
  customer: { email: string; name: string };
  meta?: Record<string, string>;
}

/** Create a hosted payment page; returns the redirect link. */
export async function createCheckout(input: CheckoutInput): Promise<{ link: string }> {
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: (input.amountCents / 100).toFixed(2),
      currency: PAYMENT_CURRENCY,
      redirect_url: `${baseURL}/api/payments/callback`,
      customer: input.customer,
      meta: input.meta ?? {},
      customizations: {
        title: input.title,
        description: input.description,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.status !== "success" || !data.data?.link) {
    throw new Error(`Flutterwave checkout failed: ${data.message ?? res.status}`);
  }
  return { link: data.data.link };
}

export interface VerifiedTransaction {
  ok: boolean;
  txRef: string;
  amountCents: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  meta?: Record<string, string>;
}

/** Server-to-server verification — never trust redirect params alone. */
export async function verifyTransaction(transactionId: string): Promise<VerifiedTransaction | null> {
  const res = await fetch(`${API}/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok || data.status !== "success" || !data.data) return null;
  const t = data.data;
  return {
    ok: t.status === "successful",
    txRef: t.tx_ref,
    amountCents: Math.round(Number(t.amount) * 100),
    currency: t.currency,
    customerEmail: t.customer?.email,
    customerName: t.customer?.name,
    meta: t.meta ?? {},
  };
}

/**
 * Idempotent fulfillment keyed on tx_ref. Safe to call from both the
 * browser callback and the webhook. Returns what was fulfilled.
 */
export async function fulfillPayment(v: VerifiedTransaction): Promise<{ kind: string; duplicate?: boolean } | { error: string }> {
  if (!v.ok) return { error: "Transaction not successful." };
  if (v.currency !== PAYMENT_CURRENCY) {
    return { error: `Unexpected currency ${v.currency}.` };
  }

  // ---- Subscription: tx_ref = sub-{userId}-{planId}-{ts}-{rand} ----
  if (v.txRef.startsWith("sub-")) {
    const existing = await prisma.subscription.findFirst({
      where: { providerCustomerId: v.txRef },
    });
    if (existing) return { kind: "subscription", duplicate: true };

    const parts = v.txRef.split("-");
    const userId = parts[1];
    const planId = parts[2];
    const plan = PLANS.find((p) => p.id === planId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!plan || !user) return { error: `Unknown plan or user in ${v.txRef}` };
    if (v.amountCents < plan.price) {
      return { error: `Underpayment: got ${v.amountCents}, expected ${plan.price}` };
    }

    const periodEnd = new Date();
    if (plan.interval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.$transaction([
      prisma.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "canceled" },
      }),
      prisma.subscription.create({
        data: {
          userId,
          plan: plan.id,
          status: "active",
          provider: "flutterwave",
          providerCustomerId: v.txRef,
          currentPeriodEnd: periodEnd,
        },
      }),
      prisma.user.updateMany({ where: { id: userId, role: "user" }, data: { role: "premium" } }),
    ]);

    await notify({
      userIds: [userId],
      type: "announcement",
      title: `Welcome to ${plan.name}! 🎉`,
      body: "Payment received — premium articles are unlocked and ads are gone.",
      priority: "high",
    });
    await logActivity({ userId, action: "subscription.paid", detail: `${plan.id} via flutterwave` });
    return { kind: "subscription" };
  }

  // ---- Donation: tx_ref = don-{ts}-{rand}, details in meta ----
  if (v.txRef.startsWith("don-")) {
    const existing = await prisma.donation.findUnique({ where: { txRef: v.txRef } });
    if (existing) return { kind: "donation", duplicate: true };

    await prisma.donation.create({
      data: {
        txRef: v.txRef,
        userId: v.meta?.userId || null,
        name: v.meta?.donorName || v.customerName || "Anonymous",
        amount: v.amountCents,
        message: v.meta?.message || null,
        provider: "flutterwave",
      },
    });
    await logActivity({
      userId: v.meta?.userId || undefined,
      action: "donation.received",
      detail: `$${(v.amountCents / 100).toFixed(2)} via flutterwave`,
    });
    return { kind: "donation" };
  }

  return { error: `Unrecognized tx_ref: ${v.txRef}` };
}
