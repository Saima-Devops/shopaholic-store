/** Display helpers shared by the admin order pages. No data access. */

export const ORDER_STATUS_COPY = {
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
} as const;

/** Same reference the customer sees on the checkout success page. */
export function orderReference(id: string): string {
  return `ATL-${id.slice(0, 8).toUpperCase()}`;
}
