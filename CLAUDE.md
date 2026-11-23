# CLAUDE.md

@AGENTS.md

## Commands
```bash
- `npm run dev` # Next dev server (rewrites the agent-rules block in AGENTS.md)
- `npm run build` is the only full typecheck (`tsc` is `noEmit`). There is no test runner.
- Schema changes: `db:generate` → read the SQL in `drizzle/` → `db:migrate`. `db:push` is dev-only.
- `db:seed` deletes all products. That cascades to `cart_items` (empties every bag) and
  nulls `order_items.product_id`. Never run it against a database with real customers.
```

## Data
- Neon HTTP driver: no `db.transaction()`. Use `db.batch()`. `DATABASE_URL` must be the pooled string.
- Pages never import `db`. Use `src/lib/products.ts` (catalogue), `src/lib/cart.ts` (bag),
  `src/lib/orders.ts` (orders).
- Write Drizzle relational `with` blocks inline. A shared `as const` config breaks result-type inference.
- All tables live in `src/db/schema.ts`. Never rename or drop Better Auth columns.
- `src/lib/cart.ts` is `server-only`. Types needed by client components go in `src/lib/cart-types.ts`.

## Money and stock
- Money is integer cents. Only `mapProduct()` and `formatCents()` divide by 100.
- `currency` rounds to whole dollars and is catalogue-only. Bag, checkout and receipts use `formatCents`.
- Never store a stock state. Derive it with `stockState()` from `stockQuantity` + `madeToOrder`.
- `cart_items` has no price, and the browser never sends an amount. Checkout rebuilds
  `line_items` from a fresh `getBag()` using `price_data` (no Stripe Price objects).
- Never pass `payment_method_types` to Stripe; leaving it out enables dynamic payment methods.
- Homepage order is `products.createdAt` desc. There is no featured/new flag.

## Orders (Stripe webhook)
- Orders are created only in the webhook, never on the success page.
- Idempotency comes from the UNIQUE on `orders.stripe_checkout_session_id`.
  Fulfillment must stay safe to run twice and at the same time.
- `async_payment_failed` writes no order row (it would use up that unique key).
- `order_items` amounts come from Stripe line items, not the catalogue.
- Oversell is accepted: stock decrements skip `madeToOrder` and floor at 0 with `greatest(…, 0)`.

## Auth and routing
- `src/proxy.ts` only checks that a cookie exists. The real gate is `requireUser()` in
  `src/lib/session.ts`. Every protected page and action must call it.
- Never add `/api/**` to the proxy matcher. Stripe sends no cookie and would be redirected.
- Any redirect built from `?next=` must go through `safeNextPath()`.
- Sign-in Server Actions call `auth.api.*` directly, so they have no rate limit.
  This must be fixed before a public launch.

## Static catalogue routes
`/`, `/new-arrivals`, `/collections/[slug]`, `/products/[slug]` must stay static
(`revalidate = 300`, `generateStaticParams`). Do not read `headers()` or the session there.
That is why `SiteHeader` shows no bag count on them. If a count is needed, fetch it in a
client component after hydration.

## Env
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must both equal the app origin.
- `DATABASE_URL` and `BETTER_AUTH_SECRET` (random, 32+ chars) are checked at import; the app
  will not start without them. Stripe keys are checked on first use, so the storefront runs without them.
- Use a restricted `rk_` Stripe key in production.
- Local webhook secret: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Next.js 16
Route `params` and `searchParams` are Promises. `PageProps` / `LayoutProps` types only exist
after `next dev` or `next build` has run.
