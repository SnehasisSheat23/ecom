-- ============================================================
-- 0023: Blog Categories
--
-- Adds:
--   1. blog_categories table
--   2. category_id column to blogs table
--
-- Safe to re-run: uses IF NOT EXISTS
-- ============================================================

-- 1. Blog Categories Table
-- -------------------------
CREATE TABLE IF NOT EXISTS blog_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(100) NOT NULL,
  description  VARCHAR(255),
  is_visible   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_category_slug_tenant
  ON blog_categories(tenant_id, slug);

CREATE INDEX IF NOT EXISTS idx_blog_categories_tenant
  ON blog_categories(tenant_id);

-- 2. Link Blogs to Categories
-- ---------------------------
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blogs' AND column_name='category_id') THEN
    ALTER TABLE blogs ADD COLUMN category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blogs_category
  ON blogs(category_id);
