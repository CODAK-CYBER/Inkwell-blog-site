import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getServerSession } from "@/lib/session";
import { fulfillPayment, verifyTransaction } from "@/lib/payments/flutterwave";

/**
 * Flutterwave redirects the customer here after checkout with
 * ?status=&tx_ref=&transaction_id=. We verify server-to-server and
 * fulfill (idempotently — the webhook may have beaten us to it).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const txRef = params.get("tx_ref") ?? "";
  const transactionId = params.get("transaction_id");

  const destination = txRef.startsWith("don-") ? "/support" : "/membership";
  const redirect = (query: string) =>
    NextResponse.redirect(new URL(`${destination}?${query}`, request.url));

  if (status === "cancelled" || !transactionId) {
    return redirect("canceled=1");
  }

  const verified = await verifyTransaction(transactionId);
  if (!verified || !verified.ok || verified.txRef !== txRef) {
    return redirect("failed=1");
  }

  const result = await fulfillPayment(verified);
  if ("error" in result) {
    console.error("payment fulfillment failed:", result.error);
    return redirect("failed=1");
  }

  // The paying user is right here with their session cookie — refresh the
  // cookie cache so a role upgrade (user → premium) applies immediately.
  if (result.kind === "subscription") {
    try {
      const session = await getServerSession();
      if (session) {
        await auth.api.updateUser({
          headers: await headers(),
          body: { name: session.user.name },
        });
      }
    } catch {
      // cache refreshes on its own within 5 minutes
    }
  }

  return redirect("success=1");
}
