import Link from "next/link";

type Crumb = { label: string; href?: string };

/**
 * The breadcrumb every listing and detail page opens with. "Home" is implied;
 * pass the trail after it. The last crumb is the current page and takes no
 * href.
 */
export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="container-page py-5">
      <ol className="type-caps text-ash flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
        </li>
        {trail.map((crumb, i) => {
          const current = i === trail.length - 1;
          return (
            <li key={crumb.label} className="contents">
              <span aria-hidden>/</span>
              {current || !crumb.href ? (
                <span
                  className={current ? "text-ink" : undefined}
                  aria-current={current ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-ink">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
