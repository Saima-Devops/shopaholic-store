/**
 * Grants or removes the admin role. This is the only way to change a role;
 * there is deliberately no UI for it.
 *
 *   npm run admin:set-role -- someone@example.com admin
 *   npm run admin:set-role -- someone@example.com customer
 *
 * It acts on whatever DATABASE_URL points at. Check that before running it.
 * The change applies on the user's next request (sessions read the role
 * from the database each time).
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { user } from "../src/db/schema";

const ROLES = ["customer", "admin"] as const;
type Role = (typeof ROLES)[number];

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

async function main() {
  const [email, role] = process.argv.slice(2);

  if (!email || !role || !isRole(role)) {
    console.error("Usage: npm run admin:set-role -- <email> <customer|admin>");
    process.exit(1);
  }

  const updated = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.email, email.trim().toLowerCase()))
    .returning({ id: user.id });

  if (updated.length === 0) {
    console.error(`No user with email ${email}. They must sign up first.`);
    process.exit(1);
  }

  console.log(`Set role "${role}" for ${email}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
