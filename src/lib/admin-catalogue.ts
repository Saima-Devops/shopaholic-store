import "server-only";

import type { BatchItem } from "drizzle-orm/batch";
import { and, asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";

/**
 * Catalogue reads and writes for `/admin`. Unlike `src/lib/products.ts`,
 * this returns raw rows in cents: the storefront's mapped `Product` type
 * rounds to dollars and hides ids.
 *
 * Nothing here checks the role. Every caller — admin pages and
 * `src/lib/admin-actions.ts` — must call `requireAdmin()` first.
 */

export type Audience = "women" | "men" | "unisex";

export type ProductInput = {
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
  audience: Audience;
  images: { url: string; alt: string }[];
};

export type CategoryInput = {
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string | null;
  position: number;
};

/* ------------------------------------------------------------------ reads */

export async function listProductsForAdmin() {
  return db.query.products.findMany({
    orderBy: [desc(products.createdAt)],
    with: {
      category: { columns: { name: true } },
      images: { orderBy: [asc(productImages.position)], limit: 1 },
    },
  });
}

export async function getProductForAdmin(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      images: { orderBy: [asc(productImages.position)] },
    },
  });
}

export async function listCategoriesForAdmin() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      imageUrl: categories.imageUrl,
      imageAlt: categories.imageAlt,
      position: categories.position,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.position), asc(categories.name));
}

export async function categoryExists(id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return Boolean(row);
}

/* ----------------------------------------------------------------- writes */

function productColumns(input: ProductInput) {
  return {
    categoryId: input.categoryId,
    slug: input.slug,
    name: input.name,
    sku: input.sku,
    colour: input.colour,
    priceCents: input.priceCents,
    compareAtCents: input.compareAtCents,
    badge: input.badge,
    description: input.description,
    details: input.details,
    care: input.care,
    stockDetail: input.stockDetail,
    audience: input.audience,
  };
}

function imageRows(productId: string, input: ProductInput) {
  return input.images.map((image, position) => ({
    productId,
    url: image.url,
    alt: image.alt,
    position,
  }));
}

/**
 * Product and images go in one `db.batch()` (Neon runs it as a single
 * transaction), so a failed image insert cannot leave a product without
 * its packshot. The id is generated here because a batch cannot read back
 * an earlier statement's result.
 */
export async function createProduct(
  input: ProductInput,
  stock: { stockQuantity: number; madeToOrder: boolean },
): Promise<string> {
  const id = crypto.randomUUID();
  const images = imageRows(id, input);

  const statements = [
    db.insert(products).values({ id, ...productColumns(input), ...stock }),
    ...(images.length > 0 ? [db.insert(productImages).values(images)] : []),
  ] as [BatchItem<"pg">, ...BatchItem<"pg">[]];

  await db.batch(statements);
  return id;
}

/**
 * Stock is not touched here — it has its own form and its own concurrency
 * check in `setStock`. Images are replaced wholesale: there are at most a
 * handful, and the unique on (product_id, position) makes in-place
 * reordering awkward.
 */
export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<boolean> {
  const images = imageRows(id, input);

  const [updated] = await db.batch([
    db
      .update(products)
      .set(productColumns(input))
      .where(eq(products.id, id))
      .returning({ id: products.id }),
    db.delete(productImages).where(eq(productImages.productId, id)),
    ...(images.length > 0 ? [db.insert(productImages).values(images)] : []),
  ] as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return Array.isArray(updated) && updated.length > 0;
}

/**
 * Optimistic concurrency. The form posts the quantity it displayed; the
 * write only lands if the row still holds that number. Otherwise a webhook
 * decrement that happened while the admin was typing would be silently
 * overwritten. Returns false when the row changed (or does not exist).
 */
export async function setStock(
  id: string,
  expectedQuantity: number,
  stockQuantity: number,
  madeToOrder: boolean,
): Promise<boolean> {
  const updated = await db
    .update(products)
    .set({ stockQuantity, madeToOrder })
    .where(
      and(eq(products.id, id), eq(products.stockQuantity, expectedQuantity)),
    )
    .returning({ id: products.id });

  return updated.length > 0;
}

export async function createCategory(input: CategoryInput): Promise<void> {
  await db.insert(categories).values(input);
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<boolean> {
  const updated = await db
    .update(categories)
    .set(input)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return updated.length > 0;
}

/**
 * `products.category_id` is `on delete restrict`, so Postgres itself refuses
 * to delete a category that still has products. The caller maps that error
 * to a message; there is no pre-count to race against.
 */
export async function deleteCategory(id: string): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}
