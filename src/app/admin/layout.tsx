import Link from "next/link";

/**
 * Admin chrome only. This layout deliberately does NO auth check: layouts do
 * not re-run on client navigation and do not guard Server Actions, so a
 * check here would look like protection without being it. Every page under
 * /admin calls `requireAdmin()` itself.
 */
export const metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="rule border-b">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-5">
          <p className="type-caps text-ink">Shopaholic admin</p>
          <nav aria-label="Admin" className="flex flex-wrap gap-6">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="link-nav py-2">
                {item.label}
              </Link>
            ))}
            <Link href="/" className="link-nav py-2 text-ash">
              Back to store
            </Link>
          </nav>
        </div>
      </header>
      <main className="container-page flex-1 py-10">{children}</main>
    </>
  );
}
