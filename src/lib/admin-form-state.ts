/**
 * Shapes and pure helpers shared by the admin forms and
 * `src/lib/admin-actions.ts`. Kept out of the actions file because a
 * `"use server"` module may only export async functions. Nothing here touches
 * the database, so client components can import it.
 */

export type AdminFormState = {
  error: string | null;
  /** Per-field messages, keyed by the input's `name`. */
  fieldErrors?: Record<string, string>;
  /** A short success note, e.g. "Saved." */
  message?: string;
};

export const emptyAdminState: AdminFormState = { error: null };

/** Up to this many image rows on the product form. */
export const MAX_PRODUCT_IMAGES = 6;

/** `next/image` only allows this host (next.config.ts). */
export const IMAGE_HOST = "images.unsplash.com";

/**
 * Cents → the string an admin edits, e.g. 12500 → "125.00". Integer maths
 * only, so a price never passes through a float on its way to the form.
 */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

const DOLLARS = /^(\d{1,6})(?:\.(\d{2}))?$/;

/**
 * "125" or "125.00" → 12500. Anything else → null: no "$", no "12.5", no
 * negatives, no exponents. Parsed from the string's digits rather than
 * `parseFloat`, so 19.99 cannot become 1998.
 */
export function inputToCents(raw: string): number | null {
  const match = DOLLARS.exec(raw.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number(match[2] ?? "0");
}
