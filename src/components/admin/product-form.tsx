"use client";

import { useActionState } from "react";

import { FieldError, FormStatus } from "@/components/admin/form-status";
import {
  createProductAction,
  updateProductAction,
} from "@/lib/admin-actions";
import {
  IMAGE_HOST,
  MAX_PRODUCT_IMAGES,
  centsToInput,
  emptyAdminState,
  type AdminFormState,
} from "@/lib/admin-form-state";

export type ProductFormValues = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  sku: string;
  colour: string;
  priceCents: number;
  compareAtCents: number | null;
  badge: string | null;
  description: string;
  details: string[];
  care: string;
  stockDetail: string | null;
  audience: "women" | "men" | "unisex";
  images: { url: string; alt: string }[];
};

type Props = {
  categories: { id: string; name: string }[];
  /** Absent → create form (with opening stock); present → edit form. */
  product?: ProductFormValues;
};

function TextField({
  state,
  name,
  label,
  defaultValue,
  hint,
  required = true,
  maxLength,
}: {
  state: AdminFormState;
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const invalid = Boolean(state.fieldErrors?.[name]);
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${name}-error` : undefined}
        className="field"
      />
      {hint ? <p className="type-meta mt-1">{hint}</p> : null}
      <FieldError state={state} name={name} />
    </div>
  );
}

export function ProductForm({ categories, product }: Props) {
  const [state, action, pending] = useActionState(
    product ? updateProductAction : createProductAction,
    emptyAdminState,
  );

  const imageSlots = Array.from(
    { length: MAX_PRODUCT_IMAGES },
    (_, i) => product?.images[i] ?? { url: "", alt: "" },
  );

  return (
    <form action={action} className="stack-lg">
      <FormStatus state={state} />

      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField state={state} name="name" label="Name" defaultValue={product?.name} maxLength={120} />
        <TextField
          state={state}
          name="slug"
          label="Slug"
          defaultValue={product?.slug}
          hint="Used in the URL: /products/<slug>. Changing it breaks old links."
          maxLength={120}
        />
        <TextField state={state} name="sku" label="SKU" defaultValue={product?.sku} maxLength={60} />
        <TextField state={state} name="colour" label="Colour" defaultValue={product?.colour} maxLength={60} />

        <div>
          <label htmlFor="categoryId" className="field-label">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={product?.categoryId ?? ""}
            className="field"
          >
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FieldError state={state} name="categoryId" />
        </div>

        <div>
          <label htmlFor="audience" className="field-label">
            Audience
          </label>
          <select
            id="audience"
            name="audience"
            defaultValue={product?.audience ?? "unisex"}
            className="field"
          >
            <option value="unisex">Unisex (women and men)</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
          </select>
          <FieldError state={state} name="audience" />
        </div>

        <TextField
          state={state}
          name="price"
          label="Price (USD)"
          defaultValue={centsToInput(product?.priceCents)}
          hint="e.g. 125 or 125.00"
        />
        <TextField
          state={state}
          name="compareAt"
          label="Compare-at price (optional)"
          defaultValue={centsToInput(product?.compareAtCents)}
          required={false}
        />
        <TextField
          state={state}
          name="badge"
          label="Badge (optional)"
          defaultValue={product?.badge}
          required={false}
          maxLength={40}
        />
        <TextField
          state={state}
          name="stockDetail"
          label="Stock note (optional)"
          defaultValue={product?.stockDetail}
          hint='e.g. "Three left in this colour"'
          required={false}
          maxLength={120}
        />
      </div>

      <div>
        <label htmlFor="description" className="field-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          maxLength={2000}
          defaultValue={product?.description}
          className="field"
        />
        <FieldError state={state} name="description" />
      </div>

      <div>
        <label htmlFor="details" className="field-label">
          Details (one per line)
        </label>
        <textarea
          id="details"
          name="details"
          rows={4}
          defaultValue={product?.details.join("\n")}
          className="field"
        />
        <FieldError state={state} name="details" />
      </div>

      <div>
        <label htmlFor="care" className="field-label">
          Care
        </label>
        <textarea
          id="care"
          name="care"
          rows={2}
          required
          maxLength={1000}
          defaultValue={product?.care}
          className="field"
        />
        <FieldError state={state} name="care" />
      </div>

      {!product ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="stockQuantity" className="field-label">
              Opening stock
            </label>
            <input
              id="stockQuantity"
              name="stockQuantity"
              type="number"
              min={0}
              max={100000}
              step={1}
              required
              defaultValue={0}
              className="field"
            />
            <FieldError state={state} name="stockQuantity" />
          </div>
          <label className="type-meta flex items-center gap-2 self-end pb-3">
            <input type="checkbox" name="madeToOrder" />
            Made to order
          </label>
        </div>
      ) : null}

      <fieldset className="stack">
        <legend className="field-label">Images</legend>
        <p className="type-meta">
          The first image is the packshot shown in grids. URLs must start with
          https://{IMAGE_HOST}/. Leave a row empty to skip it.
        </p>
        {imageSlots.map((image, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`imageUrl${i}`} className="sr-only">
                Image {i + 1} URL
              </label>
              <input
                id={`imageUrl${i}`}
                name={`imageUrl${i}`}
                type="url"
                placeholder={`Image ${i + 1} URL`}
                defaultValue={image.url}
                className="field"
              />
              <FieldError state={state} name={`imageUrl${i}`} />
            </div>
            <div>
              <label htmlFor={`imageAlt${i}`} className="sr-only">
                Image {i + 1} description
              </label>
              <input
                id={`imageAlt${i}`}
                name={`imageAlt${i}`}
                placeholder="Describe the image"
                maxLength={200}
                defaultValue={image.alt}
                className="field"
              />
              <FieldError state={state} name={`imageAlt${i}`} />
            </div>
          </div>
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block sm:min-w-56"
      >
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
