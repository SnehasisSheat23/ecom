-- Migration 0060: Final schema parity alignment with legacy database

-- 1. Rename vendor_id to partner_id in orders and order_items if applicable
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE "orders" RENAME COLUMN "vendor_id" TO "partner_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE "order_items" RENAME COLUMN "vendor_id" TO "partner_id";
  END IF;
END $$;

-- 2. Add missing columns to vendor_ledger
ALTER TABLE "vendor_ledger" 
  ADD COLUMN IF NOT EXISTS "gross_amount" integer,
  ADD COLUMN IF NOT EXISTS "commission_amount" integer;

-- 3. Create missing tenant_stats table
CREATE TABLE IF NOT EXISTS "tenant_stats" (
  "tenant_id" uuid PRIMARY KEY,
  "total_revenue" bigint NOT NULL DEFAULT 0,
  "total_orders" integer NOT NULL DEFAULT 0,
  "total_commission" bigint NOT NULL DEFAULT 0,
  "total_vendors" integer NOT NULL DEFAULT 0,
  "total_customers" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Create missing waitlist table
CREATE TABLE IF NOT EXISTS "waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text,
  "coin" integer DEFAULT 1,
  "created_at" timestamp DEFAULT now()
);
