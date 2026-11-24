import { Breadcrumb } from "@/components/breadcrumb";
import { pieceCount, ProductGrid } from "@/components/product-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { currency } from "@/lib/format";
import { GIFT_MAX_PRICE, getGiftEdit } from "@/lib/products";
import { services } from "@/lib/sample-data";

/** Rebuild at most every five minutes so catalogue edits land without a deploy. */
export const revalidate = 300;

/** Catalogue display only, so whole dollars via `currency` is right here. */
const ceiling = currency.format(GIFT_MAX_PRICE);

export const metadata = {
  title: "Gifts",
  description: `Gifts under ${ceiling}, boxed and ribboned by hand.`,
};

export default async function GiftsPage() {
  const pieces = await getGiftEdit();
  const wrapping = services.find((s) => s.title === "Gift wrapping");

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb trail={[{ label: "Gifts" }]} />

        <header className="container-page section-tight pt-2">
          <div className="stack max-w-xl">
            <p className="type-caps text-ash">The gift edit</p>
            <h1>Gifts under {ceiling}</h1>
            <p className="type-lead max-w-prose">
              Small pieces made with the same hands as the large ones — chosen
              to be opened, and then used for years.
            </p>
          </div>
        </header>

        <ProductGrid
          label="Gifts"
          pieces={pieces}
          count={pieceCount(pieces.length)}
          order="Price, low to high"
          empty={{
            copy: "The gift edit is being restocked. The full collection is still open.",
            href: "/new-arrivals",
            cta: "See what has just arrived",
          }}
        />

        {wrapping ? (
          <section className="rule-top">
            <div className="container-page section-tight">
              <div className="grid-split">
                <h2 className="max-w-sm text-2xl">{wrapping.title}</h2>
                <p className="type-meta max-w-sm">{wrapping.copy}</p>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}
