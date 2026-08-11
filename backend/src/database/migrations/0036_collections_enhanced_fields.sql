ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "image_url" varchar(500);
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "type" varchar(20) DEFAULT 'MANUAL' NOT NULL;
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "rules" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "sort_order" varchar(50) DEFAULT 'MANUAL' NOT NULL;
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "meta_title" varchar(255);
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "meta_description" varchar(500);

CREATE INDEX IF NOT EXISTS "idx_collections_tenant_status" ON "collections" ("tenant_id", "is_active");
