import { AudienceListing } from "@/components/audience-listing";

/** Rebuild at most every five minutes so catalogue edits land without a deploy. */
export const revalidate = 300;

export const metadata = {
  title: "Men",
  description: "Leather goods, eyewear and accessories for men.",
};

export default function MenPage() {
  return <AudienceListing audience="men" />;
}
