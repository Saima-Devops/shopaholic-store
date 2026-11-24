import Image from "next/image";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { stories } from "@/lib/sample-data";

export const metadata = {
  title: "Stories",
  description: "From the workshop: how the pieces are made, and why.",
};

export default function StoriesPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb trail={[{ label: "Stories" }]} />

        <header className="container-page section-tight pt-2">
          <div className="stack max-w-xl">
            <p className="type-caps text-ash">From the workshop</p>
            <h1>Stories</h1>
            <p className="type-lead max-w-prose">
              How the pieces are made, who makes them, and why we would rather
              make fewer.
            </p>
          </div>
        </header>

        {/* --- Same tile as the homepage Collections strip ---------------- */}
        <section aria-label="Stories" className="container-page section-tight pt-0">
          <ul className="rule-top grid gap-x-4 gap-y-12 pt-10 md:grid-cols-3">
            {stories.map((story, i) => (
              <li key={story.slug}>
                <Link href={`/stories/${story.slug}`} className="group block">
                  <div className="media-frame aspect-[2/3]">
                    <Image
                      src={story.image}
                      alt={story.alt}
                      fill
                      priority={i === 0}
                      sizes="(min-width: 48rem) 31vw, 92vw"
                      className="transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="stack-sm mt-5">
                    <p className="type-caps text-ash">{story.eyebrow}</p>
                    <h2 className="text-2xl">{story.title}</h2>
                    <p className="type-meta">{story.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
