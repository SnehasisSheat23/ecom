-- Migration 0050: Create variant_prices table and backfill existing variant prices

CREATE TABLE IF NOT EXISTS "variant_prices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "variant_id" UUID NOT NULL REFERENCES "variants"("id") ON DELETE CASCADE,
  "currency_code" VARCHAR(3) NOT NULL,
  "price" INTEGER NOT NULL,
  "compare_at_price" INTEGER,
  "cost_per_item" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate currency entries for the same variant in a tenant
CREATE UNIQUE INDEX IF NOT EXISTS "uq_variant_price_currency" 
  ON "variant_prices" ("tenant_id", "variant_id", "currency_code");

-- Lookup index for price queries & storefront filters
CREATE INDEX IF NOT EXISTS "idx_variant_prices_lookup" 
  ON "variant_prices" ("tenant_id", "currency_code", "price");

-- Index by variant_id for quick variant joins
CREATE INDEX IF NOT EXISTS "idx_variant_prices_variant" 
  ON "variant_prices" ("variant_id");

-- Backfill existing variant prices into variant_prices table matching tenant currency
INSERT INTO "variant_prices" ("tenant_id", "variant_id", "currency_code", "price", "compare_at_price", "cost_per_item", "created_at", "updated_at")
SELECT 
  v.tenant_id,
  v.id AS variant_id,
  COALESCE(t.currency, 'INR') AS currency_code,
  v.price,
  v.compare_at_price,
  v.cost_per_item,
  COALESCE(v.created_at, NOW()),
  COALESCE(v.updated_at, NOW())
FROM "variants" v
LEFT JOIN "tenants" t ON v.tenant_id = t.id
ON CONFLICT ("tenant_id", "variant_id", "currency_code") DO UPDATE
SET 
  "price" = EXCLUDED."price",
  "compare_at_price" = EXCLUDED."compare_at_price",
  "cost_per_item" = EXCLUDED."cost_per_item",
  "updated_at" = NOW();
