"use client";

import { useActionState } from "react";

import { FieldError, FormStatus } from "@/components/admin/form-status";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/lib/admin-actions";
import { IMAGE_HOST, emptyAdminState } from "@/lib/admin-form-state";

export type CategoryFormValues = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string | null;
  position: number;
};

/**
 * Create when `category` is absent, edit otherwise. Input ids are prefixed
 * per category because the page renders one form per row.
 */
export function CategoryForm({ category }: { category?: CategoryFormValues }) {
  const [state, action, pending] = useActionState(
    category ? updateCategoryAction : createCategoryAction,
    emptyAdminState,
  );
  const prefix = category ? `cat-${category.id}` : "cat-new";

  return (
    <form action={action} className="stack">
      {category ? (
        <input type="hidden" name="categoryId" value={category.id} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
        <div>
          <label htmlFor={`${prefix}-name`} className="field-label">
            Name
          </label>
          <input
            id={`${prefix}-name`}
            name="name"
            required
            maxLength={80}
            defaultValue={category?.name}
            className="field"
          />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label htmlFor={`${prefix}-slug`} className="field-label">
            Slug
          </label>
          <input
            id={`${prefix}-slug`}
            name="slug"
            required
            maxLength={120}
            defaultValue={category?.slug}
            className="field"
          />
          <FieldError state={state} name="slug" />
        </div>
        <div>
          <label htmlFor={`${prefix}-position`} className="field-label">
            Position
          </label>
          <input
            id={`${prefix}-position`}
            name="position"
            type="number"
            min={0}
            max={1000}
            step={1}
            required
            defaultValue={category?.position ?? 0}
            className="field"
          />
          <FieldError state={state} name="position" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-imageUrl`} className="field-label">
            Image URL (optional — shows it on the homepage)
          </label>
          <input
            id={`${prefix}-imageUrl`}
            name="imageUrl"
            type="url"
            placeholder={`https://${IMAGE_HOST}/…`}
            defaultValue={category?.imageUrl ?? ""}
            className="field"
          />
          <FieldError state={state} name="imageUrl" />
        </div>
        <div>
          <label htmlFor={`${prefix}-imageAlt`} className="field-label">
            Image description
          </label>
          <input
            id={`${prefix}-imageAlt`}
            name="imageAlt"
            maxLength={200}
            defaultValue={category?.imageAlt ?? ""}
            className="field"
          />
          <FieldError state={state} name="imageAlt" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-outline">
          {pending ? "Saving…" : category ? "Save" : "Create category"}
        </button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

/** Postgres refuses the delete while products reference the category. */
export function DeleteCategoryButton({
  categoryId,
  disabled,
}: {
  categoryId: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    deleteCategoryAction,
    emptyAdminState,
  );

  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="categoryId" value={categoryId} />
      <button
        type="submit"
        disabled={disabled || pending}
        title={disabled ? "Move its products to another category first" : undefined}
        className="btn btn-quiet text-oxblood"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      <FormStatus state={state} />
    </form>
  );
}
