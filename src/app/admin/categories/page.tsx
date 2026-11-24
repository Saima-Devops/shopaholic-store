import {
  CategoryForm,
  DeleteCategoryButton,
} from "@/components/admin/category-form";
import { listCategoriesForAdmin } from "@/lib/admin-catalogue";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categories");
  const categories = await listCategoriesForAdmin();

  return (
    <div className="container-prose stack-lg">
      <h1 className="text-4xl">Categories</h1>

      <section className="rule stack border-b pb-8">
        <h2 className="text-xl">New category</h2>
        <CategoryForm />
      </section>

      {categories.length === 0 ? (
        <p className="type-meta">No categories yet.</p>
      ) : (
        <ul className="stack-lg">
          {categories.map((category) => (
            <li key={category.id} className="rule stack border-b pb-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="text-xl">{category.name}</h2>
                <p className="type-meta" data-numeric>
                  {category.productCount}{" "}
                  {category.productCount === 1 ? "product" : "products"}
                </p>
              </div>
              <CategoryForm
                category={{
                  id: category.id,
                  slug: category.slug,
                  name: category.name,
                  imageUrl: category.imageUrl,
                  imageAlt: category.imageAlt,
                  position: category.position,
                }}
              />
              <DeleteCategoryButton
                categoryId={category.id}
                disabled={category.productCount > 0}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
