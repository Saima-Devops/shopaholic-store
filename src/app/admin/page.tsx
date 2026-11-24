import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Checked even here, so a non-admin learns nothing — they get a 404. */
export default async function AdminIndexPage() {
  await requireAdmin("/admin");
  redirect("/admin/products");
}
