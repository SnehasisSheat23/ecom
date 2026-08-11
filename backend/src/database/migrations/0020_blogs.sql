-- ============================================================
-- 0020: Blog Module
--
-- Adds:
--   1. blogs table with multi-tenant vendor approval workflow
--   2. blog_images table for gallery images
--
-- Safe to re-run: uses IF NOT EXISTS
-- ============================================================

-- 1. Blogs Table
-- ---------------
CREATE TABLE IF NOT EXISTS blogs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  vendor_id         UUID REFERENCES vendors(id),
  author_id         UUID NOT NULL REFERENCES customers(id),
  title             VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  excerpt           VARCHAR(500),
  content           TEXT NOT NULL,
  cover_image_url   VARCHAR(500),
  status            VARCHAR(20) NOT NULL DEFAULT 'draft',
  is_visible        BOOLEAN NOT NULL DEFAULT TRUE,
  rejection_reason  VARCHAR(1000),
  meta_title        VARCHAR(255),
  meta_description  VARCHAR(500),
  tags              JSONB NOT NULL DEFAULT '[]',
  published_at      TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_slug_tenant
  ON blogs(tenant_id, slug);

CREATE INDEX IF NOT EXISTS idx_blogs_tenant
  ON blogs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_blogs_vendor
  ON blogs(vendor_id);

CREATE INDEX IF NOT EXISTS idx_blogs_status
  ON blogs(tenant_id, status, is_visible);

-- 2. Blog Images Table
-- ---------------------
CREATE TABLE IF NOT EXISTS blog_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  blog_id     UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(255),
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_images_blog
  ON blog_images(blog_id);
