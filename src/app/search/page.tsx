import { Breadcrumb } from "@/components/breadcrumb";
import { pieceCount, ProductGrid } from "@/components/product-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SEARCH_MAX_LENGTH, searchProducts } from "@/lib/products";

export const metadata = {
  title: "Search",
  description: "Search the collection.",
};

/** `?q=` can arrive as a string, an array or not at all. */
function readQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const query = readQuery((await searchParams).q);
  const pieces = query ? await searchProducts(query) : [];

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb trail={[{ label: "Search" }]} />

        <header className="container-page section-tight pt-2">
          <div className="stack-lg max-w-xl">
            <h1>Search</h1>

            {/* GET, so results are linkable and work without JavaScript. */}
            <form action="/search" method="get" role="search" className="stack">
              <div>
                <label htmlFor="q" className="field-label">
                  Search the collection
                </label>
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={query}
                  maxLength={SEARCH_MAX_LENGTH}
                  placeholder="Silk, cognac, sunglasses…"
                  autoComplete="off"
                  className="field"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block sm:min-w-56">
                Search
              </button>
            </form>
          </div>
        </header>

        {query ? (
          <ProductGrid
            label={`Results for ${query}`}
            pieces={pieces}
            count={`${pieceCount(pieces.length)} for “${query}”`}
            order="Newest first"
            empty={{
              copy: `Nothing matches “${query}”. Try a colour, a material or a category.`,
              href: "/new-arrivals",
              cta: "See what has just arrived",
            }}
          />
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}
