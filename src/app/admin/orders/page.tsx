import Link from "next/link";

import { formatCents } from "@/lib/format";
import { ORDER_STATUS_COPY, orderReference } from "@/lib/order-display";
import { listOrdersForAdmin } from "@/lib/orders";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Orders" };

const LIMIT = 200;

const placed = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrdersPage() {
  await requireAdmin("/admin/orders");
  const orders = await listOrdersForAdmin(LIMIT);

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <h1 className="text-4xl">Orders</h1>
        <p className="type-meta">
          Newest first, latest {LIMIT}. Refunds are made in the Stripe
          Dashboard and show here automatically.
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="type-meta">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="type-caps text-ash">
              <tr className="rule border-b">
                <th className="py-3 pr-4 font-normal">Order</th>
                <th className="py-3 pr-4 font-normal">Placed</th>
                <th className="py-3 pr-4 font-normal">Customer</th>
                <th className="py-3 pr-4 font-normal">Items</th>
                <th className="py-3 pr-4 font-normal">Total</th>
                <th className="py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="rule border-b">
                  <td className="py-4 pr-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="link text-ink"
                      data-numeric
                    >
                      {orderReference(order.id)}
                    </Link>
                  </td>
                  <td className="py-4 pr-4" data-numeric>
                    {placed.format(order.createdAt)}
                  </td>
                  <td className="py-4 pr-4">{order.email}</td>
                  <td className="py-4 pr-4" data-numeric>
                    {order.items.reduce((n, item) => n + item.quantity, 0)}
                  </td>
                  <td className="py-4 pr-4" data-numeric>
                    {formatCents(order.totalCents)}
                  </td>
                  <td
                    className={`py-4 ${order.status === "paid" ? "" : "text-oxblood"}`}
                  >
                    {ORDER_STATUS_COPY[order.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
