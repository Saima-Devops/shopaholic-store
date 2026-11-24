import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { stories } from "@/lib/sample-data";

/** Only the stories in sample-data exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return stories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/stories/[slug]">) {
  const { slug } = await params;
  const story = stories.find((s) => s.slug === slug);
  if (!story) return { title: "Story not found" };
  return { title: story.title, description: story.excerpt };
}

export default async function StoryPage({
  params,
}: PageProps<"/stories/[slug]">) {
  const { slug } = await params;
  const story = stories.find((s) => s.slug === slug);
  if (!story) notFound();

  const others = stories.filter((s) => s.slug !== slug);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb
          trail={[{ label: "Stories", href: "/stories" }, { label: story.title }]}
        />

        {/* --- Same split as the homepage atelier section ----------------- */}
        <article className="container-page section-tight pt-2">
          <div className="grid-split">
            <div className="media-frame aspect-[4/5]">
              <Image
                src={story.image}
                alt={story.alt}
                fill
                priority
                sizes="(min-width: 64rem) 46vw, 92vw"
                className="object-cover"
              />
            </div>
            <div className="stack-lg">
              <div className="stack-sm">
                <p className="type-caps text-ash">{story.eyebrow}</p>
                <h1 className="max-w-md">{story.title}</h1>
              </div>
              <div className="stack">
                {story.body.map((paragraph) => (
                  <p key={paragraph} className="type-lead max-w-prose">
                    {paragraph}
                  </p>
                ))}
              </div>
              <Link href={story.shop.href} className="btn btn-outline self-start">
                {story.shop.label}
              </Link>
            </div>
          </div>
        </article>

        {others.length > 0 ? (
          <section className="rule-top">
            <div className="container-page section-tight">
              <h2 className="text-2xl">More stories</h2>
              <ul className="type-caps mt-6 flex flex-wrap gap-x-8 gap-y-4">
                {others.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/stories/${item.slug}`} className="link-nav py-2">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}
