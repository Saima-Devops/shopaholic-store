/**
 * Postgres error checks that work whether or not Drizzle wrapped the error.
 *
 * Drizzle wraps single-query failures in `DrizzleQueryError` and keeps the
 * driver error on `.cause`; `db.batch()` throws the driver error as is. So
 * the code and constraint name may be on the error or on its cause.
 */

type PgErrorFields = { code?: unknown; constraint?: unknown };

function pgFields(error: unknown): PgErrorFields | null {
  if (typeof error !== "object" || error === null) return null;
  if ("code" in error) return error as PgErrorFields;
  const cause = (error as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    return cause as PgErrorFields;
  }
  return null;
}

/** 23505 unique_violation. */
export function isUniqueViolation(error: unknown): boolean {
  return pgFields(error)?.code === "23505";
}

/** 23503 foreign_key_violation. */
export function isForeignKeyViolation(error: unknown): boolean {
  return pgFields(error)?.code === "23503";
}

/** The violated constraint's name, e.g. `products_sku_unique`. */
export function violatedConstraint(error: unknown): string | null {
  const constraint = pgFields(error)?.constraint;
  return typeof constraint === "string" ? constraint : null;
}
