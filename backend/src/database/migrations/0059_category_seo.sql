ALTER TABLE "categories" 
  ADD COLUMN IF NOT EXISTS "meta_title" varchar(255),
  ADD COLUMN IF NOT EXISTS "meta_description" varchar(500),
  ADD COLUMN IF NOT EXISTS "h1" varchar(255),
  ADD COLUMN IF NOT EXISTS "h2" text,
  ADD COLUMN IF NOT EXISTS "keywords" jsonb DEFAULT '[]'::jsonb;
