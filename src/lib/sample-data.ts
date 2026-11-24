/**
 * Static storefront chrome: the hero, the atelier story, the services strip and
 * the navigation labels. The catalogue itself now lives in Postgres — see
 * `src/lib/products.ts` for products, categories and stock.
 *
 * Imagery: Unsplash, referenced by URL. All frames were chosen to be free of
 * third-party branding.
 */

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const hero = {
  season: "Autumn winter 2026",
  title: "The Long Coat",
  copy: "Twelve pieces cut from Italian wool, made to be worn for a decade rather than a season.",
  image: unsplash("1613915617430-8ab0fd7c6baf"),
  alt: "Model wearing a tailored grey wool coat over black separates",
};

export const atelier = {
  title: "Made in Scandicci, finished by hand",
  copy: [
    "Every bag leaves one bench. A single artisan cuts the hide, saddle-stitches the gussets and burnishes the edges, then signs the lining with their own number.",
    "It takes eleven hours and around forty years of accumulated practice. We would rather make fewer.",
  ],
  image: unsplash("1554825959-e9a6670d4f18"),
  alt: "Leather working tools arranged on a dark bench",
};

export const services = [
  {
    title: "Complimentary delivery",
    copy: "Shipped in two working days, returned free within thirty.",
  },
  {
    title: "Gift wrapping",
    copy: "Boxed in cotton-lined card, ribboned, with a handwritten card.",
  },
  {
    title: "Repairs for life",
    copy: "Send any leather piece back to the bench that made it.",
  },
];

/**
 * Chrome navigation. Only the routes that exist carry a real href; the rest
 * stay on "#" until their pages land.
 */
export const footerNav = [
  {
    heading: "Client services",
    links: [
      { label: "Contact us", href: "#" },
      { label: "Shipping", href: "#" },
      { label: "Returns", href: "#" },
      { label: "Order tracking", href: "#" },
      { label: "Repairs", href: "#" },
    ],
  },
  {
    heading: "The house",
    links: [
      { label: "Our story", href: "#" },
      { label: "Sustainability", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Store locator", href: "#" },
      { label: "Press", href: "#" },
    ],
  },
  {
    heading: "Shop",
    links: [
      { label: "New in", href: "/new-arrivals" },
      { label: "Women", href: "/women" },
      { label: "Men", href: "/men" },
      { label: "Leather goods", href: "/collections/leather-goods" },
      { label: "Gifts", href: "/gifts" },
    ],
  },
];

export const primaryNav = [
  { label: "New in", href: "/new-arrivals" },
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Leather goods", href: "/collections/leather-goods" },
  { label: "Gifts", href: "/gifts" },
  { label: "Stories", href: "/stories" },
];

/**
 * Editorial stories. Static copy like the hero and atelier blocks — there is
 * no CMS. `slug` is the public identifier for /stories/[slug] and React keys.
 */
export type Story = {
  slug: string;
  eyebrow: string;
  title: string;
  excerpt: string;
  image: string;
  alt: string;
  body: string[];
  /** Where the story sends a reader who wants the pieces in it. */
  shop: { label: string; href: string };
};

export const stories: Story[] = [
  {
    slug: "one-bench",
    eyebrow: "The workshop",
    title: "One bench, one pair of hands",
    excerpt:
      "Why every bag is cut, stitched and finished by the same artisan, start to end.",
    image: unsplash("1554825959-e9a6670d4f18"),
    alt: "Leather working tools arranged on a dark bench",
    body: [
      "Most bags are assembled on a line: one person cuts, another skives, a third stitches. Ours are not. A single artisan takes the hide from the roll and hands back a finished piece.",
      "It is slower, and it is meant to be. When one person owns every step, a crooked stitch has nowhere to hide — and the lining carries the number of the hands that made it.",
      "Send any leather piece back and it returns to that same bench for repair, for as long as you own it.",
    ],
    shop: { label: "Shop leather goods", href: "/collections/leather-goods" },
  },
  {
    slug: "the-long-coat",
    eyebrow: "Autumn winter 2026",
    title: "The long coat, in twelve pieces",
    excerpt:
      "A double-faced wool coat cut to the ankle, and the season built around it.",
    image: unsplash("1485462537746-965f33f7f6a7"),
    alt: "Model in a pale wool coat and printed scarf walking through a stone colonnade",
    body: [
      "The season started with a single cloth: double-faced virgin wool from Biella, heavy enough to hold a line without a lining.",
      "With no lining to hide behind, every edge is bound by hand. The result drapes like a cape and wears like a blanket.",
      "Around it we built twelve pieces — scarves, frames and bags chosen to sit against camel and charcoal for a decade rather than a season.",
    ],
    shop: { label: "Shop ready-to-wear", href: "/collections/ready-to-wear" },
  },
  {
    slug: "printed-in-como",
    eyebrow: "Silk",
    title: "An archive drawing, printed in Como",
    excerpt:
      "How a chain motif from 1971 became this season's foulard.",
    image: unsplash("1551028442-ee84b4d3a50a"),
    alt: "Violet silk scarf printed with a chain motif, loosely folded",
    body: [
      "The drawing sat in the archive for fifty-five years: a chain and shell motif, sketched in pencil for a scarf that was never made.",
      "This year it was re-engraved for a 90 cm square and printed on silk twill in Como, one colour screen at a time.",
      "The hem is rolled and stitched by hand, so the edge stays soft against the neck.",
    ],
    shop: { label: "Shop silk", href: "/collections/silk" },
  },
];
