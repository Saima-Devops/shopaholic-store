import { Breadcrumb } from "@/components/breadcrumb";
import { pieceCount, ProductGrid } from "@/components/product-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { type Audience, getProductsByAudience } from "@/lib/products";
import { hero } from "@/lib/sample-data";

const copy: Record<Audience, { title: string; lead: string }> = {
  women: {
    title: "Women",
    lead: "Bags, silk, jewellery and the long coat — every piece cut, stitched and finished in our own workshops.",
  },
  men: {
    title: "Men",
    lead: "Leather that darkens with use, frames cut from block acetate and wool woven in Biella.",
  },
};

/**
 * The women's and men's edits. Same shell as New arrivals: breadcrumb,
 * typographic header, then the shared product grid. Unisex pieces appear in
 * both.
 */
export async function AudienceListing({ audience }: { audience: Audience }) {
  const pieces = await getProductsByAudience(audience);
  const { title, lead } = copy[audience];

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb trail={[{ label: title }]} />

        <header className="container-page section-tight pt-2">
          <div className="stack max-w-xl">
            <p className="type-caps text-ash">{hero.season}</p>
            <h1>{title}</h1>
            <p className="type-lead max-w-prose">{lead}</p>
          </div>
        </header>

        <ProductGrid
          label={`${title} pieces`}
          pieces={pieces}
          count={pieceCount(pieces.length)}
          order="Newest first"
          empty={{
            copy: "This edit is between deliveries. The next pieces are still on the bench.",
            href: "/new-arrivals",
            cta: "See what has just arrived",
          }}
        />
      </main>

      <SiteFooter />
    </>
  );
}
