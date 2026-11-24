ALTER TABLE "carts" ADD COLUMN "checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "status" text DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_stripe_payment_intent_id_key" UNIQUE("stripe_payment_intent_id");