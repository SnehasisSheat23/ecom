-- Create the media_assets table
CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "vendor_id" uuid,
  "url" varchar(500) NOT NULL,
  "storage_path" varchar(500),
  "filename" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL DEFAULT 'image/jpeg',
  "size_bytes" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Add temporary nullable media_id column to product_images
ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "media_id" uuid;

-- Migrate existing product_images to media_assets
INSERT INTO "media_assets" ("id", "tenant_id", "vendor_id", "url", "storage_path", "filename", "mime_type", "size_bytes")
SELECT 
  gen_random_uuid() as id, 
  pi.tenant_id, 
  p.vendor_id, 
  pi.url, 
  pi.storage_path, 
  COALESCE(split_part(pi.url, '/', cardinality(string_to_array(pi.url, '/'))), 'image.jpg') as filename,
  'image/jpeg' as mime_type,
  0 as size_bytes
FROM "product_images" pi
JOIN "products" p ON pi.product_id = p.id;

-- Link existing product_images rows to media_assets
UPDATE "product_images" pi
SET "media_id" = ma.id
FROM "media_assets" ma
WHERE pi.url = ma.url AND pi.tenant_id = ma.tenant_id;

-- Make media_id NOT NULL and add foreign key constraint
ALTER TABLE "product_images" ALTER COLUMN "media_id" SET NOT NULL;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE CASCADE;

-- Drop old url and storage_path columns from product_images
ALTER TABLE "product_images" DROP COLUMN IF EXISTS "url";
ALTER TABLE "product_images" DROP COLUMN IF EXISTS "storage_path";
