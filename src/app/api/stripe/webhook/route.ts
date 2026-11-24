import type Stripe from "stripe";

import {
  applyRefund,
  fulfillCheckoutSession,
  releaseCheckoutSession,
} from "@/lib/orders";
import { stripe, webhookSecret } from "@/lib/stripe";

/**
 * Stripe's event endpoint — where orders are actually created.
 *
 * Node runtime, not edge: signature verification needs Node crypto and the
 * Neon driver is Node-only.
 *
 * Note this route must stay out of `src/proxy.ts`'s matcher. Stripe sends no
 * cookies, so the proxy would answer every event with a 307 to /sign-in and
 * Stripe would record each one as a delivery failure.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // The RAW body. `request.json()`, or anything that reparses, changes the
  // bytes the signature was computed over and verification fails.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret(),
    );
  } catch {
    // Deliberately no detail and no payload: an unverified body is
    // attacker-controlled, and stdout ends up in telemetry.
    console.warn("Stripe webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfillCheckoutSession(event.data.object.id);
        break;

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        // No row is written and the bag is left intact so the customer can
        // retry. Writing a failed order here would consume the unique on
        // stripe_checkout_session_id and make a later success for the same
        // session look like a replay. Releasing only unblocks a new checkout.
        console.info(event.type, event.data.object.id);
        await releaseCheckoutSession(
          event.data.object.id,
          event.data.object.metadata?.cart_id,
        );
        break;

      case "charge.refunded": {
        const intent = event.data.object.payment_intent;
        const intentId = typeof intent === "string" ? intent : intent?.id;
        if (intentId) await applyRefund(intentId);
        break;
      }

      case "charge.dispute.created":
        // Not tracked on the order yet. Handle it in the Stripe Dashboard.
        console.warn("Stripe dispute opened", event.data.object.id);
        break;

      default:
        // 200 for anything else, so an over-broad endpoint subscription
        // never looks like an outage in the Stripe dashboard.
        break;
    }
  } catch (error) {
    // 500 so Stripe retries. Fulfillment is idempotent, so that is safe.
    console.error("Stripe webhook handler failed", event.type, error);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
