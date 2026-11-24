import Link from "next/link";
import { notFound } from "next/navigation";

import { formatCents } from "@/lib/format";
import { ORDER_STATUS_COPY, orderReference } from "@/lib/order-display";
import { getOrderForAdmin } from "@/lib/orders";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const placed = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Read-only. Every amount here is what Stripe charged, snapshotted by the
 * webhook — never recomputed from today's catalogue.
 */
export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/orders/${encodeURIComponent(id)}`);

  if (!UUID_PATTERN.test(id)) notFound();
  const order = await getOrderForAdmin(id);
  if (!order) notFound();

  const rows: [string, string][] = [
    ["Placed", placed.format(order.createdAt)],
    ["Status", ORDER_STATUS_COPY[order.status]],
    ["Customer", `${order.user.name} (${order.user.email})`],
    ["Charged email", order.email],
    ["Total", formatCents(order.totalCents)],
    ["Refunded", formatCents(order.refundedCents)],
    ["Currency", order.currency.toUpperCase()],
    ["Stripe PaymentIntent", order.stripePaymentIntentId ?? "—"],
    ["Stripe Checkout Session", order.stripeCheckoutSessionId],
  ];

  return (
    <div className="container-prose stack-lg">
      <Link href="/admin/orders" className="link-nav self-start">
        ← Orders
      </Link>

      <h1 className="text-4xl" data-numeric>
        {orderReference(order.id)}
      </h1>

      <dl className="stack-sm text-sm">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="rule flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b pb-3"
          >
            <dt className="text-ash">{label}</dt>
            <dd className="break-all text-ink" data-numeric>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="stack">
        <h2 className="text-xl">Items</h2>
        <table className="w-full text-left text-sm">
          <thead className="type-caps text-ash">
            <tr className="rule border-b">
              <th className="py-3 pr-4 font-normal">Item</th>
              <th className="py-3 pr-4 font-normal">Unit</th>
              <th className="py-3 pr-4 font-normal">Qty</th>
              <th className="py-3 font-normal">Line total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="rule border-b align-top">
                <td className="py-4 pr-4">
                  <p className="text-ink">
                    {item.productId ? (
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="link"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </p>
                  <p className="type-meta">
                    {item.sku}
                    {item.colour ? ` · ${item.colour}` : ""}
                  </p>
                </td>
                <td className="py-4 pr-4" data-numeric>
                  {formatCents(item.unitPriceCents)}
                </td>
                <td className="py-4 pr-4" data-numeric>
                  {item.quantity}
                </td>
                <td className="py-4" data-numeric>
                  {formatCents(item.lineTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
