-- Migration 0046: Create product_types table
-- This table defines product classes (Cake, Flower, Plant, Add-on, etc.)
-- Each product references a product_type via product_type_id

CREATE TABLE IF NOT EXISTS "product_types" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
    "partner_id" uuid,
    "name" varchar(255) NOT NULL,
    "slug" varchar(255) NOT NULL,
    "description" text,
    "default_product_type" varchar(20) DEFAULT 'physical' NOT NULL,
    "attributes_schema" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_type_slug_tenant" ON "product_types" ("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "idx_product_types_tenant_vendor" ON "product_types" ("tenant_id", "partner_id");
CREATE INDEX IF NOT EXISTS "idx_product_types_tenant_status" ON "product_types" ("tenant_id", "is_active");

-- Also sync: products.product_type_id column (may be missing from DB)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_type_id" uuid REFERENCES "product_types"("id");

-- Also sync: products.short_description
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "short_description" varchar(500);

-- Also sync: products.canonical_url
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "canonical_url" varchar(500);

-- Also sync: products.tax_class
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tax_class" varchar(50);

-- Also sync: products.rejection_reason
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "rejection_reason" varchar(1000);

-- Also sync: products.vendor_commission_override
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "vendor_commission_override" numeric(5,2);

-- Also sync: media_assets.partner_id
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "partner_id" uuid;
