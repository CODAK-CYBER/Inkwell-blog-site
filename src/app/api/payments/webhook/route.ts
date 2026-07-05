import { NextRequest, NextResponse } from "next/server";
import { fulfillPayment, verifyTransaction } from "@/lib/payments/flutterwave";

/**
 * Flutterwave webhook (configure in the Flutterwave dashboard →
 * Settings → Webhooks, with the same secret hash as FLUTTERWAVE_SECRET_HASH).
 * Guarantees fulfillment even if the customer never returns from checkout.
 */
export async function POST(request: NextRequest) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const signature = request.headers.get("verif-hash");
  if (signature !== secretHash) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    event?: string;
    data?: { id?: number; status?: string; tx_ref?: string };
  };

  if (payload.event !== "charge.completed" || payload.data?.status !== "successful") {
    return NextResponse.json({ received: true }); // ack non-payment events
  }

  // Always re-verify against the API — never trust webhook payloads alone.
  const verified = payload.data.id ? await verifyTransaction(String(payload.data.id)) : null;
  if (!verified || !verified.ok) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const result = await fulfillPayment(verified);
  if ("error" in result) {
    console.error("webhook fulfillment failed:", result.error);
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ fulfilled: result.kind, duplicate: result.duplicate ?? false });
}
