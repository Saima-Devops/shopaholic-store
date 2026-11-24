import Link from "next/link";

import { ProductForm } from "@/components/admin/product-form";
import { listCategoriesForAdmin } from "@/lib/admin-catalogue";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  await requireAdmin("/admin/products/new");
  const categories = await listCategoriesForAdmin();

  return (
    <div className="container-prose stack-lg">
      <Link href="/admin/products" className="link-nav self-start">
        ← Products
      </Link>
      <h1 className="text-4xl">New product</h1>
      {categories.length === 0 ? (
        <p className="type-meta">
          Create a <Link href="/admin/categories" className="link">category</Link>{" "}
          first.
        </p>
      ) : (
        <ProductForm
          categories={categories.map(({ id, name }) => ({ id, name }))}
        />
      )}
    </div>
  );
}
