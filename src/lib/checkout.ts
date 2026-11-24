"use server";

import { redirect } from "next/navigation";

import {
  getBag,
  getCheckoutSessionId,
  setCheckoutSessionId,
} from "@/lib/cart";
import type { CartFormState } from "@/lib/cart-form-state";
import { requireUser } from "@/lib/session";
import { appUrl, stripe } from "@/lib/stripe";

/**
 * Starts a Stripe-hosted Checkout Session for the caller's bag.
 *
 * The form posts nothing. Every amount, quantity and product identity is
 * re-derived here from `getBag(user.id)` — a fresh read of `cart_items`
 * joined to live `products.priceCents`. Nothing about money crosses the
 * browser, so there is nothing for a tampered form to change.
 */

/**
 * Label for Stripe's integration analytics, per the current guidance for API
 * version 2026-03-25.dahlia and later. A hand-generated literal on purpose:
 * a value computed per request would put every session in its own Dashboard
 * bucket and make the comparison it exists for meaningless.
 */
const INTEGRATION_IDENTIFIER = "atelier_hosted_qkzwbmta";

/**
 * Stripe's minimum session lifetime is 30 minutes from creation. One extra
 * minute keeps request latency from pushing us under it. A short life also
 * narrows the window for stale prices and the accepted oversell.
 */
const SESSION_LIFETIME_SECONDS = 31 * 60;

/**
 * One bag, one payable session. Without this, two tabs (or a retry while a
 * bank payment is still pending) could pay for the same bag twice.
 *
 * - `open`     → expire it, so it can no longer be paid, and carry on.
 * - `complete` → the webhook clears the pointer once it has fulfilled or
 *                failed the payment. Still set means the payment is being
 *                processed or confirmed, so block a second checkout.
 * - `expired`  → nothing to do.
 *
 * Returns an error message to show, or null to proceed.
 */
async function closePreviousSession(cartId: string): Promise<string | null> {
  const previousId = await getCheckoutSessionId(cartId);
  if (!previousId) return null;

  let previous;
  try {
    previous = await stripe.checkout.sessions.retrieve(previousId);
  } catch (error) {
    // Gone from this Stripe account (e.g. keys switched): nothing to close.
    // Anything else (network, auth) rethrows and fails this checkout attempt.
    if ((error as { code?: string }).code === "resource_missing") return null;
    throw error;
  }

  if (previous.status === "complete") {
    return "Your last payment is still being confirmed. Please check back in a few minutes.";
  }

  if (previous.status === "open") {
    try {
      await stripe.checkout.sessions.expire(previousId);
    } catch {
      // Lost a race with the customer completing it in another tab.
      return "Your last checkout is finishing. Please refresh in a moment.";
    }
  }

  return null;
}

export async function startCheckout(
  _prev: CartFormState,
  _formData: FormData,
): Promise<CartFormState> {
  const currentUser = await requireUser("/bag");
  const bag = await getBag(currentUser.id);

  if (!bag.cartId || bag.lines.length === 0) {
    return { error: "Your bag is empty." };
  }

  // Re-check stock against the same fresh read the prices came from, so a
  // piece that sold out while the bag sat open cannot reach Stripe.
  const unavailable = bag.lines.find(
    (line) =>
      line.stock === "sold_out" ||
      (line.availableQuantity !== null &&
        line.quantity > line.availableQuantity),
  );
  if (unavailable) {
    return {
      error: `${unavailable.name} is no longer available in that quantity. Please update your bag.`,
    };
  }

  let url: string | null = null;

  try {
    const blocked = await closePreviousSession(bag.cartId);
    if (blocked) return { error: blocked };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: bag.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: "usd",
          // Straight off products.price_cents, read moments ago.
          unit_amount: line.unitPriceCents,
          product_data: {
            name: line.name,
            description: line.colour,
            images: line.image ? [line.image.src] : undefined,
            // How the webhook maps Stripe's lines back to our catalogue.
            metadata: { product_id: line.productId, sku: line.sku },
          },
        },
      })),
      customer_email: currentUser.email,
      client_reference_id: currentUser.id,
      metadata: { user_id: currentUser.id, cart_id: bag.cartId },
      // Copied onto the PaymentIntent so refund events, which carry no
      // session, can still be recognised as one of our orders.
      payment_intent_data: {
        metadata: { user_id: currentUser.id, cart_id: bag.cartId },
      },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
      // {CHECKOUT_SESSION_ID} is a Stripe placeholder — keep it literal.
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/bag?cancelled=1`,
      integration_identifier: INTEGRATION_IDENTIFIER,
      // No payment_method_types: omitting it is what turns on dynamic
      // payment methods, configured from the Stripe dashboard.
    });
    await setCheckoutSessionId(bag.cartId, session.id);
    url = session.url;
  } catch (error) {
    console.error("Failed to create Stripe Checkout Session", error);
    return { error: "We could not start checkout. Please try again." };
  }

  if (!url) return { error: "We could not start checkout. Please try again." };

  // Outside the try: redirect() works by throwing, and the catch above would
  // swallow it into an error state instead of navigating.
  redirect(url);
}
