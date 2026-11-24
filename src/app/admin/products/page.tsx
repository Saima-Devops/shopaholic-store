import Image from "next/image";
import Link from "next/link";

import { StockForm } from "@/components/admin/stock-form";
import { listProductsForAdmin } from "@/lib/admin-catalogue";
import { formatCents } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { stockCopy, stockState, stockTone } from "@/lib/stock";

export const dynamic = "force-dynamic";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin("/admin/products");
  const products = await listProductsForAdmin();

  return (
    <div className="stack-lg">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-4xl">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="type-meta">No products yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="type-caps text-ash">
              <tr className="rule border-b">
                <th className="py-3 pr-4 font-normal">
                  <span className="sr-only">Image</span>
                </th>
                <th className="py-3 pr-4 font-normal">Product</th>
                <th className="py-3 pr-4 font-normal">Category</th>
                <th className="py-3 pr-4 font-normal">Price</th>
                <th className="py-3 pr-4 font-normal">State</th>
                <th className="py-3 font-normal">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const state = stockState(product);
                const packshot = product.images[0];
                return (
                  <tr key={product.id} className="rule border-b align-top">
                    <td className="py-4 pr-4">
                      <div className="media-frame w-14">
                        {packshot ? (
                          <Image
                            src={packshot.url}
                            alt=""
                            width={112}
                            height={150}
                            sizes="3.5rem"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="link text-ink"
                      >
                        {product.name}
                      </Link>
                      <p className="type-meta">
                        {product.sku} · {product.colour}
                      </p>
                    </td>
                    <td className="py-4 pr-4">{product.category.name}</td>
                    <td className="py-4 pr-4" data-numeric>
                      {formatCents(product.priceCents)}
                    </td>
                    <td className={`py-4 pr-4 ${stockTone[state]}`}>
                      {stockCopy[state]}
                    </td>
                    <td className="py-4">
                      <StockForm
                        productId={product.id}
                        stockQuantity={product.stockQuantity}
                        madeToOrder={product.madeToOrder}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
