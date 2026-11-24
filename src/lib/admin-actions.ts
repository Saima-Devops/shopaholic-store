"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  categoryExists,
  createCategory,
  createProduct,
  deleteCategory,
  setStock,
  updateCategory,
  updateProduct,
  type Audience,
  type CategoryInput,
  type ProductInput,
} from "@/lib/admin-catalogue";
import {
  IMAGE_HOST,
  MAX_PRODUCT_IMAGES,
  inputToCents,
  type AdminFormState,
} from "@/lib/admin-form-state";
import {
  isForeignKeyViolation,
  isUniqueViolation,
  violatedConstraint,
} from "@/lib/db-errors";
import { requireAdmin } from "@/lib/session";

/**
 * Admin mutations.
 *
 * Server Actions are public POST endpoints: anyone can call one directly,
 * without ever loading an admin page. So the FIRST line of every exported
 * function below is `await requireAdmin(...)`. Do not move it below any
 * other work, and do not rely on the page or layout having checked.
 *
 * Every field is re-validated here; the browser's `required`/`pattern`
 * attributes are only a convenience.
 */

/* ------------------------------------------------------------ validation */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const AUDIENCES: readonly Audience[] = ["women", "men", "unisex"];

/** Stripe's smallest USD charge. */
const MIN_PRICE_CENTS = 50;
const MAX_STOCK = 100_000;
const MAX_DETAILS = 12;
const MAX_POSITION = 1000;

/** Collects field errors so a form can show all of them at once. */
class Fields {
  errors: Record<string, string> = {};

  constructor(private readonly formData: FormData) {}

  private raw(name: string): string {
    const value = this.formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  }

  text(name: string, label: string, max: number): string {
    const value = this.raw(name);
    if (!value) this.errors[name] = `${label} is required.`;
    else if (value.length > max) {
      this.errors[name] = `${label} must be ${max} characters or fewer.`;
    }
    return value;
  }

  optionalText(name: string, label: string, max: number): string | null {
    const value = this.raw(name);
    if (value.length > max) {
      this.errors[name] = `${label} must be ${max} characters or fewer.`;
    }
    return value || null;
  }

  slug(name = "slug"): string {
    const value = this.raw(name).toLowerCase();
    if (!value || value.length > 120 || !SLUG_PATTERN.test(value)) {
      this.errors[name] =
        "Use lowercase letters, numbers and single hyphens, e.g. silk-scarf.";
    }
    return value;
  }

  uuid(name: string, label: string): string {
    const value = this.raw(name).toLowerCase();
    if (!UUID_PATTERN.test(value)) this.errors[name] = `Choose a ${label}.`;
    return value;
  }

  int(name: string, label: string, min: number, max: number): number {
    const value = this.raw(name);
    const parsed = /^\d+$/.test(value) ? Number(value) : NaN;
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      this.errors[name] = `${label} must be a whole number from ${min} to ${max}.`;
      return min;
    }
    return parsed;
  }

  cents(name: string, label: string, required: boolean): number | null {
    const value = this.raw(name);
    if (!value) {
      if (required) this.errors[name] = `${label} is required.`;
      return null;
    }
    const cents = inputToCents(value);
    if (cents === null) {
      this.errors[name] = `${label} must look like 125 or 125.00.`;
    }
    return cents;
  }

  checkbox(name: string): boolean {
    return this.formData.get(name) === "on";
  }

  imageUrl(name: string): string | null {
    const value = this.raw(name);
    if (!value) return null;
    let url: URL | null = null;
    try {
      url = new URL(value);
    } catch {
      // handled below
    }
    if (
      !url ||
      url.protocol !== "https:" ||
      url.hostname !== IMAGE_HOST ||
      value.length > 500
    ) {
      this.errors[name] = `Image URLs must start with https://${IMAGE_HOST}/`;
      return null;
    }
    return url.toString();
  }

  get ok(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  get state(): AdminFormState {
    return { error: "Please fix the highlighted fields.", fieldErrors: this.errors };
  }

  string(name: string): string {
    return this.raw(name);
  }
}

function readProduct(fields: Fields): ProductInput {
  const priceCents = fields.cents("price", "Price", true);
  const compareAtCents = fields.cents("compareAt", "Compare-at price", false);

  if (priceCents !== null && priceCents < MIN_PRICE_CENTS) {
    fields.errors.price = "Price must be at least 0.50.";
  }
  if (
    priceCents !== null &&
    compareAtCents !== null &&
    compareAtCents <= priceCents
  ) {
    fields.errors.compareAt = "Compare-at price must be higher than the price.";
  }

  const audience = fields.string("audience") as Audience;
  if (!AUDIENCES.includes(audience)) {
    fields.errors.audience = "Choose who this piece is for.";
  }

  const details = fields
    .string("details")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (details.length > MAX_DETAILS || details.some((d) => d.length > 200)) {
    fields.errors.details = `Up to ${MAX_DETAILS} lines, 200 characters each.`;
  }

  const images: ProductInput["images"] = [];
  for (let i = 0; i < MAX_PRODUCT_IMAGES; i++) {
    const url = fields.imageUrl(`imageUrl${i}`);
    const alt = fields.string(`imageAlt${i}`);
    if (!url) continue;
    if (!alt || alt.length > 200) {
      fields.errors[`imageAlt${i}`] = "Describe the image (200 characters max).";
      continue;
    }
    images.push({ url, alt });
  }

  return {
    categoryId: fields.uuid("categoryId", "category"),
    slug: fields.slug(),
    name: fields.text("name", "Name", 120),
    sku: fields.text("sku", "SKU", 60),
    colour: fields.text("colour", "Colour", 60),
    priceCents: priceCents ?? 0,
    compareAtCents,
    badge: fields.optionalText("badge", "Badge", 40),
    description: fields.text("description", "Description", 2000),
    details,
    care: fields.text("care", "Care", 1000),
    stockDetail: fields.optionalText("stockDetail", "Stock note", 120),
    audience,
    images,
  };
}

/** Maps a unique violation on slug or SKU to the field that caused it. */
function duplicateState(error: unknown): AdminFormState | null {
  if (!isUniqueViolation(error)) return null;
  const constraint = violatedConstraint(error) ?? "";
  const fieldErrors: Record<string, string> = constraint.includes("sku")
    ? { sku: "That SKU is already used." }
    : { slug: "That slug is already used." };
  return { error: "Please fix the highlighted fields.", fieldErrors };
}

/**
 * Admin edits are rare, and the storefront pages are statically generated
 * with a 5-minute revalidate. Refreshing everything makes the change show
 * immediately on every listing it appears in.
 */
function refreshStorefront() {
  revalidatePath("/", "layout");
}

/* --------------------------------------------------------------- products */

export async function createProductAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/products/new");

  const fields = new Fields(formData);
  const input = readProduct(fields);
  const stockQuantity = fields.int("stockQuantity", "Stock", 0, MAX_STOCK);
  const madeToOrder = fields.checkbox("madeToOrder");
  if (!fields.ok) return fields.state;

  if (!(await categoryExists(input.categoryId))) {
    return { error: "That category no longer exists.", fieldErrors: { categoryId: "Choose a category." } };
  }

  let id: string;
  try {
    id = await createProduct(input, { stockQuantity, madeToOrder });
  } catch (error) {
    const duplicate = duplicateState(error);
    if (duplicate) return duplicate;
    console.error("Admin: create product failed", error);
    return { error: "The product could not be saved. Please try again." };
  }

  refreshStorefront();
  // Outside the try: redirect() works by throwing.
  redirect(`/admin/products/${id}?created=1`);
}

export async function updateProductAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/products");

  const fields = new Fields(formData);
  const id = fields.uuid("productId", "product");
  const input = readProduct(fields);
  if (!fields.ok) return fields.state;

  if (!(await categoryExists(input.categoryId))) {
    return { error: "That category no longer exists.", fieldErrors: { categoryId: "Choose a category." } };
  }

  try {
    const found = await updateProduct(id, input);
    if (!found) return { error: "That product no longer exists." };
  } catch (error) {
    const duplicate = duplicateState(error);
    if (duplicate) return duplicate;
    console.error("Admin: update product failed", error);
    return { error: "The product could not be saved. Please try again." };
  }

  refreshStorefront();
  return { error: null, message: "Saved." };
}

export async function updateStockAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/products");

  const fields = new Fields(formData);
  const id = fields.uuid("productId", "product");
  // Not capped at MAX_STOCK: it must match whatever the row really holds.
  const expected = fields.int("expectedQuantity", "Shown stock", 0, 2_000_000_000);
  const stockQuantity = fields.int("stockQuantity", "Stock", 0, MAX_STOCK);
  const madeToOrder = fields.checkbox("madeToOrder");
  if (!fields.ok) return fields.state;

  const saved = await setStock(id, expected, stockQuantity, madeToOrder);
  if (!saved) {
    return {
      error:
        "Stock changed since you loaded this page (a sale may have come in). Reload and try again.",
    };
  }

  refreshStorefront();
  return { error: null, message: "Stock updated." };
}

/* ------------------------------------------------------------- categories */

function readCategory(fields: Fields): CategoryInput {
  const imageUrl = fields.imageUrl("imageUrl");
  const imageAlt = fields.optionalText("imageAlt", "Image description", 200);
  if (imageUrl && !imageAlt) {
    fields.errors.imageAlt = "Describe the image.";
  }
  return {
    slug: fields.slug(),
    name: fields.text("name", "Name", 80),
    imageUrl,
    imageAlt: imageUrl ? imageAlt : null,
    position: fields.int("position", "Position", 0, MAX_POSITION),
  };
}

export async function createCategoryAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/categories");

  const fields = new Fields(formData);
  const input = readCategory(fields);
  if (!fields.ok) return fields.state;

  try {
    await createCategory(input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Please fix the highlighted fields.", fieldErrors: { slug: "That slug is already used." } };
    }
    console.error("Admin: create category failed", error);
    return { error: "The category could not be saved. Please try again." };
  }

  refreshStorefront();
  return { error: null, message: "Category created." };
}

export async function updateCategoryAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/categories");

  const fields = new Fields(formData);
  const id = fields.uuid("categoryId", "category");
  const input = readCategory(fields);
  if (!fields.ok) return fields.state;

  try {
    const found = await updateCategory(id, input);
    if (!found) return { error: "That category no longer exists." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Please fix the highlighted fields.", fieldErrors: { slug: "That slug is already used." } };
    }
    console.error("Admin: update category failed", error);
    return { error: "The category could not be saved. Please try again." };
  }

  refreshStorefront();
  return { error: null, message: "Saved." };
}

export async function deleteCategoryAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/categories");

  const fields = new Fields(formData);
  const id = fields.uuid("categoryId", "category");
  if (!fields.ok) return { error: "That category could not be deleted." };

  try {
    await deleteCategory(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { error: "Move or retire its products first. A category with products cannot be deleted." };
    }
    console.error("Admin: delete category failed", error);
    return { error: "The category could not be deleted. Please try again." };
  }

  refreshStorefront();
  return { error: null, message: "Deleted." };
}
