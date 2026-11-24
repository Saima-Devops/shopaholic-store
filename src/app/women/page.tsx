import { AudienceListing } from "@/components/audience-listing";

/** Rebuild at most every five minutes so catalogue edits land without a deploy. */
export const revalidate = 300;

export const metadata = {
  title: "Women",
  description: "Bags, silk, jewellery and ready-to-wear for women.",
};

export default function WomenPage() {
  return <AudienceListing audience="women" />;
}
