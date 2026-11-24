import "server-only";

import type { BatchItem } from "drizzle-orm/batch";
import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cartItems,
  carts,
  orderItems,
  orders,
  productImages,
  products,
} from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { stripe } from "@/lib/stripe";

/**
 * Order fulfillment.
 *
 * This runs from the Stripe webhook, never from the success page: customers
 * are not guaranteed to load that page — they can pay and immediately lose
 * their connection — and anything that only happens there silently drops
 * orders.
 *
 * It must be safe to run more than once and concurrently. Stripe retries
 * deliveries, and `checkout.session.completed` and
 * `checkout.session.async_payment_succeeded` can both arrive for a single
 * session. The `orders.stripe_checkout_session_id` UNIQUE constraint is what
 * makes that safe; the pre-check below is only the fast path.
 */

/** Far above any real bag; a bound for `autoPagingToArray`. */
const MAX_LINE_ITEMS = 1000;


/**
 * The related product is pulled in only for its packshot, as a fallback for
 * `orderItems.imageUrl`: rows written before that column was snapshotted
 * have none, and the live image is a better answer than an empty frame. The
 * snapshot still wins where it exists, so a re-shot product does not change
 * an old receipt.
 */
export async function getOrderByStripeSessionId(sessionId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.stripeCheckoutSessionId, sessionId),
    with: {
      items: {
        with: {
          product: {
            with: { images: { orderBy: [asc(productImages.position)], limit: 1 } },
          },
        },
      },
    },
  });
}

export async function getOrdersForUser(userId: string) {
  return db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: [desc(orders.createdAt)],
    with: { items: true },
  });
}

/**
 * Packshot, slug and colour for the pieces on a session that has no order
 * row yet. Stripe's line items carry none of these, so the success page's
 * "still confirming" state would otherwise show empty frames. Keyed by
 * product id; a piece deleted since checkout is simply absent.
 */
export async function getProductPreviews(productIds: string[]) {
  const previews = new Map<
    string,
    { slug: string; colour: string; image: string | null }
  >();
  if (productIds.length === 0) return previews;

  const rows = await db.query.products.findMany({
    where: inArray(products.id, productIds),
    columns: { id: true, slug: true, colour: true },
    with: { images: { orderBy: [asc(productImages.position)], limit: 1 } },
  });

  for (const row of rows) {
    previews.set(row.id, {
      slug: row.slug,
      colour: row.colour,
      image: row.images[0]?.url ?? null,
    });
  }
  return previews;
}

/* Admin reads. Callers must have run `requireAdmin()`; these return every
   customer's orders. */

export async function listOrdersForAdmin(limit = 200) {
  return db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    limit,
    with: { items: { columns: { quantity: true } } },
  });
}

export async function getOrderForAdmin(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      user: { columns: { name: true, email: true } },
      items: true,
    },
  });
}

export async function fulfillCheckoutSession(sessionId: string): Promise<void> {
  // Fast path for retries and for the second of the two success events.
  const existing = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.stripeCheckoutSessionId, sessionId))
    .limit(1);

  if (existing.length > 0) return;

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  // With delayed-notification methods, `completed` arrives while the session
  // is still unpaid. Fulfilling on that alone would ship for payments that
  // later fail.
  if (session.payment_status === "unpaid") return;

  const userId = session.client_reference_id ?? session.metadata?.user_id;
  if (!userId) {
    // What a synthetic `stripe trigger` payload looks like. Not an error.
    console.info("Stripe session has no user reference, skipping", sessionId);
    return;
  }

  // Listed and paginated rather than expanded: an expanded `line_items`
  // holds only the first page, which would silently drop lines from big bags.
  const stripeLines = await stripe.checkout.sessions
    .listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    })
    .autoPagingToArray({ limit: MAX_LINE_ITEMS });
  if (stripeLines.length === 0) {
    console.warn("Stripe session has no line items", sessionId);
    return;
  }

  /* Amounts come from Stripe, never from the catalogue: the session may have
     been created before a re-price, and what was charged is what the receipt
     must say. Only descriptive fields are filled from our own rows. */
  const parsed = stripeLines.map((item) => {
    const price = item.price;
    const product =
      price && typeof price.product === "object" && !("deleted" in price.product)
        ? price.product
        : null;

    return {
      productId: product?.metadata?.product_id ?? null,
      sku: product?.metadata?.sku ?? "",
      name: item.description ?? product?.name ?? "Item",
      unitPriceCents: price?.unit_amount ?? 0,
      quantity: item.quantity ?? 1,
      lineTotalCents: item.amount_total ?? 0,
    };
  });

  const productIds = parsed
    .map((line) => line.productId)
    .filter((id): id is string => id !== null);

  const catalogue =
    productIds.length > 0
      ? await db.query.products.findMany({
          where: inArray(products.id, productIds),
          columns: {
            id: true,
            slug: true,
            name: true,
            sku: true,
            colour: true,
          },
          with: {
            images: { orderBy: [asc(productImages.position)], limit: 1 },
          },
        })
      : [];

  const byId = new Map(catalogue.map((row) => [row.id, row]));

  const orderId = crypto.randomUUID();

  const lines = parsed.map((line) => {
    const row = line.productId ? byId.get(line.productId) : undefined;
    return {
      orderId,
      // Null if the piece has since been deleted — the snapshot still stands.
      productId: row?.id ?? null,
      productSlug: row?.slug ?? "",
      name: row?.name ?? line.name,
      sku: row?.sku ?? line.sku,
      colour: row?.colour ?? "",
      // Snapshot the packshot too: the receipt should still show the piece
      // after the catalogue is re-shot or the product is deleted.
      imageUrl: row?.images[0]?.url ?? null,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      lineTotalCents: line.lineTotalCents,
    };
  });

  /* Made-to-order pieces are excluded in the WHERE rather than skipped here,
     so the rule lives in one place. `greatest(…, 0)` is where the accepted
     oversell window lands: two customers can both clear the pre-session
     stock check and pay, and the second decrement floors at zero instead of
     going negative. */
  const decrements = parsed
    .filter((line) => line.productId !== null)
    .map((line) =>
      db
        .update(products)
        .set({
          stockQuantity: sql`greatest(${products.stockQuantity} - ${line.quantity}, 0)`,
        })
        .where(
          and(
            eq(products.id, line.productId!),
            eq(products.madeToOrder, false),
          ),
        ),
    );

  const cartId = session.metadata?.cart_id;

  /* Take only what was bought out of the bag. Deleting every line would also
     remove pieces added in another tab after checkout started. A line whose
     quantity was raised meanwhile keeps the difference. */
  const purchased = new Map<string, number>();
  for (const line of parsed) {
    if (line.productId) {
      purchased.set(
        line.productId,
        (purchased.get(line.productId) ?? 0) + line.quantity,
      );
    }
  }

  const bagCleanup = cartId
    ? [
        ...[...purchased].map(([productId, quantity]) =>
          db
            .update(cartItems)
            .set({
              quantity: sql`${cartItems.quantity} - ${quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(cartItems.cartId, cartId),
                eq(cartItems.productId, productId),
              ),
            ),
        ),
        db
          .delete(cartItems)
          .where(and(eq(cartItems.cartId, cartId), lte(cartItems.quantity, 0))),
        // Lets the customer start a new checkout, but only if this session
        // is still the recorded one.
        db
          .update(carts)
          .set({ checkoutSessionId: null })
          .where(
            and(eq(carts.id, cartId), eq(carts.checkoutSessionId, session.id)),
          ),
      ]
    : [];

  // The Neon HTTP driver has no interactive transactions, so the order id is
  // generated above and every statement is known up front. Neon runs a batch
  // as one transaction, so a failure anywhere rolls all of it back.
  const statements = [
    db.insert(orders).values({
      id: orderId,
      userId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      email:
        session.customer_details?.email ?? session.customer_email ?? "unknown",
      totalCents: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
    }),
    db.insert(orderItems).values(lines),
    ...decrements,
    ...bagCleanup,
  ] as [BatchItem<"pg">, ...BatchItem<"pg">[]];

  try {
    await db.batch(statements);
  } catch (error) {
    if (isUniqueViolation(error)) {
      // A concurrent delivery won the race and wrote this order first.
      console.info("Order already fulfilled concurrently", sessionId);
      return;
    }
    throw error;
  }
}

/**
 * A session that failed or expired can no longer be paid, so the bag may start
 * a new checkout. No order row is written; the bag and stock stay as they are.
 * Safe to replay: it only clears a pointer that still names this session.
 */
export async function releaseCheckoutSession(
  sessionId: string,
  cartId: string | undefined,
): Promise<void> {
  if (!cartId) return;

  await db
    .update(carts)
    .set({ checkoutSessionId: null })
    .where(and(eq(carts.id, cartId), eq(carts.checkoutSessionId, sessionId)));
}

/**
 * Mirrors Stripe's refund total onto the order.
 *
 * The amounts are read fresh from Stripe, not from the event, and written as
 * absolute values, so replays and out-of-order deliveries all end at the
 * same row state.
 */
export async function applyRefund(paymentIntentId: string): Promise<void> {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const charge =
    intent.latest_charge && typeof intent.latest_charge === "object"
      ? intent.latest_charge
      : null;
  if (!charge) return;

  const refundedCents = charge.amount_refunded;
  const status =
    refundedCents >= charge.amount
      ? "refunded"
      : refundedCents > 0
        ? "partially_refunded"
        : "paid";

  const updated = await db
    .update(orders)
    .set({ refundedCents, status })
    .where(eq(orders.stripePaymentIntentId, paymentIntentId))
    .returning({ id: orders.id });

  if (updated.length === 0 && intent.metadata?.user_id) {
    // One of ours, but fulfillment has not written the order yet. Throwing
    // makes the route answer 500, so Stripe retries later.
    throw new Error(`No order yet for refunded payment ${paymentIntentId}`);
  }
}
