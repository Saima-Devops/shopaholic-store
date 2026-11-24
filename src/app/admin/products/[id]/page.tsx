import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { StockForm } from "@/components/admin/stock-form";
import {
  getProductForAdmin,
  listCategoriesForAdmin,
} from "@/lib/admin-catalogue";
import { requireAdmin } from "@/lib/session";
import { stockCopy, stockState } from "@/lib/stock";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit product" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function AdminEditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/products/${encodeURIComponent(id)}`);

  // A malformed id would be a Postgres cast error, not a 404.
  if (!UUID_PATTERN.test(id)) notFound();

  const [product, categories] = await Promise.all([
    getProductForAdmin(id),
    listCategoriesForAdmin(),
  ]);
  if (!product) notFound();

  const { created } = await searchParams;

  return (
    <div className="container-prose stack-lg">
      <Link href="/admin/products" className="link-nav self-start">
        ← Products
      </Link>

      <div className="stack-sm">
        <h1 className="text-4xl">{product.name}</h1>
        <p className="type-meta">
          <Link href={`/products/${product.slug}`} className="link">
            View in store
          </Link>
        </p>
        {created ? (
          <p role="status" className="type-meta text-ink">
            Product created.
          </p>
        ) : null}
      </div>

      <section className="rule stack border-b pb-8">
        <h2 className="text-xl">Stock</h2>
        <p className="type-meta">
          Currently {stockCopy[stockState(product)].toLowerCase()} ·{" "}
          {product.stockQuantity} in stock
        </p>
        <StockForm
          productId={product.id}
          stockQuantity={product.stockQuantity}
          madeToOrder={product.madeToOrder}
        />
      </section>

      <section className="stack">
        <h2 className="text-xl">Details</h2>
        <ProductForm
          categories={categories.map(({ id, name }) => ({ id, name }))}
          product={{
            id: product.id,
            categoryId: product.categoryId,
            slug: product.slug,
            name: product.name,
            sku: product.sku,
            colour: product.colour,
            priceCents: product.priceCents,
            compareAtCents: product.compareAtCents,
            badge: product.badge,
            description: product.description,
            details: product.details,
            care: product.care,
            stockDetail: product.stockDetail,
            audience: product.audience,
            images: product.images.map(({ url, alt }) => ({ url, alt })),
          }}
        />
      </section>
    </div>
  );
}
