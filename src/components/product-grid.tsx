import Link from "next/link";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/products";

type Props = {
  label: string;
  pieces: Product[];
  /** Left of the rule, e.g. "8 pieces". */
  count: ReactNode;
  /** Right of the rule, e.g. "Newest first". */
  order: string;
  empty: { copy: string; href: string; cta: string };
};

/**
 * The rule, count and `ProductCard` grid that New arrivals and every
 * collection already render, with the same empty state.
 */
export function ProductGrid({ label, pieces, count, order, empty }: Props) {
  return (
    <section aria-label={label} className="container-page section-tight pt-0">
      <div className="rule flex flex-wrap items-baseline justify-between gap-4 pb-6">
        <p className="type-caps text-ash" data-numeric>
          {count}
        </p>
        <p className="type-caps text-ash">{order}</p>
      </div>

      {pieces.length > 0 ? (
        <div className="grid-products mt-10">
          {pieces.map((product, i) => (
            <ProductCard key={product.slug} product={product} priority={i < 2} />
          ))}
        </div>
      ) : (
        <div className="stack mt-10 max-w-sm">
          <p className="type-lead">{empty.copy}</p>
          <Link href={empty.href} className="btn btn-outline self-start">
            {empty.cta}
          </Link>
        </div>
      )}
    </section>
  );
}

/** "1 piece" / "8 pieces". */
export function pieceCount(n: number): string {
  return `${n} ${n === 1 ? "piece" : "pieces"}`;
}
