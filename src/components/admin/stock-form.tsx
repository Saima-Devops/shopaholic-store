"use client";

import { useActionState } from "react";

import { FieldError, FormStatus } from "@/components/admin/form-status";
import { updateStockAction } from "@/lib/admin-actions";
import { emptyAdminState } from "@/lib/admin-form-state";

/**
 * `expectedQuantity` carries the number this form was rendered with. The
 * action only writes if the row still holds it, so a sale that lands while
 * the admin is typing is not silently overwritten.
 */
export function StockForm({
  productId,
  stockQuantity,
  madeToOrder,
}: {
  productId: string;
  stockQuantity: number;
  madeToOrder: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateStockAction,
    emptyAdminState,
  );
  const inputId = `stock-${productId}`;

  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="expectedQuantity" value={stockQuantity} />

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={inputId} className="sr-only">
          Stock quantity
        </label>
        <input
          id={inputId}
          name="stockQuantity"
          type="number"
          min={0}
          max={100000}
          step={1}
          required
          defaultValue={stockQuantity}
          className="field w-24"
        />
        <label className="type-meta flex items-center gap-2">
          <input
            type="checkbox"
            name="madeToOrder"
            defaultChecked={madeToOrder}
          />
          Made to order
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-outline"
        >
          {pending ? "Saving…" : "Update"}
        </button>
      </div>

      <FieldError state={state} name="stockQuantity" />
      <FormStatus state={state} />
    </form>
  );
}
