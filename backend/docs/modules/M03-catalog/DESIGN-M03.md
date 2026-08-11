# DESIGN-M03 — Catalog

<!-- TODO: Expand with full DDL, sequence diagrams, and detailed service interface before implementation -->

## File Map

| File | Purpose | Imports |
|------|---------|---------|
| `catalog.schema.ts` | Drizzle tables: `products`, `variants`, `categories`, `product_images`, `product_categories`, `price_history` | `drizzle-orm`, `tenancy.schema` |
| `catalog.types.ts` | Product, Variant, Category, Image interfaces | — |
| `catalog.validators.ts` | Zod schemas for product/variant/category CRUD | `zod` |
| `catalog.repository.ts` | All DB queries | `catalog.schema`, `db` |
| `catalog.service.ts` | Business logic: CRUD, price history, cache invalidation | `catalog.repository`, `storage.provider`, `redis` |
| `catalog.routes.ts` | Admin + public endpoints | `catalog.service`, `catalog.validators` |
| `catalog.test.ts` | Unit tests | `catalog.service` |

## Database Schema (DDL)

```sql
CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE product_type AS ENUM ('physical', 'digital');

CREATE TABLE products (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id),
  vendor_id                   UUID,
  title                       VARCHAR(255) NOT NULL,
  slug                        VARCHAR(255) NOT NULL,
  description                 TEXT,
  short_description           VARCHAR(500),
  status                      product_status NOT NULL DEFAULT 'draft',
  product_type                product_type NOT NULL DEFAULT 'physical',
  meta_title                  VARCHAR(255),
  meta_description            VARCHAR(500),
  canonical_url               VARCHAR(500),
  tax_class                   VARCHAR(50),
  vendor_commission_override  DECIMAL(5,2),
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_slug_tenant UNIQUE (tenant_id, slug)
);

CREATE TABLE variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  product_id        UUID NOT NULL REFERENCES products(id),
  sku               VARCHAR(100) NOT NULL,
  title             VARCHAR(255) NOT NULL,
  price             INTEGER NOT NULL,
  compare_at_price  INTEGER,
  attributes        JSONB NOT NULL DEFAULT '{}',
  track_inventory   BOOLEAN NOT NULL DEFAULT true,
  position          INTEGER NOT NULL DEFAULT 0,
  is_default        BOOLEAN NOT NULL DEFAULT false,
  weight_grams      INTEGER,
  length_mm         INTEGER,
  width_mm          INTEGER,
  height_mm         INTEGER,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_variant_sku_tenant UNIQUE (tenant_id, sku)
);

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  parent_id   UUID REFERENCES categories(id),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  description TEXT,
  image_url   VARCHAR(500),
  position    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_category_slug_tenant UNIQUE (tenant_id, slug)
);

CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  variant_id  UUID REFERENCES variants(id),
  url         VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(255),
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_categories (
  product_id  UUID NOT NULL REFERENCES products(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  variant_id  UUID NOT NULL REFERENCES variants(id),
  old_price   INTEGER NOT NULL,
  new_price   INTEGER NOT NULL,
  changed_by  UUID,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_tenant_status ON products(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_tenant_vendor ON products(tenant_id, vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug ON products(tenant_id, slug);
CREATE INDEX idx_variants_product ON variants(product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_variants_sku ON variants(tenant_id, sku);
CREATE INDEX idx_categories_tenant ON categories(tenant_id, parent_id);
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_price_history_variant ON price_history(variant_id, changed_at DESC);

-- Application-level tenant filtering
-- Every tenant-scoped repository query must include tenant_id in the predicate.
```

## Known Gotchas

1. **Product slug generation.** Auto-generate from title but allow override. Must be unique per tenant, not globally.
2. **Variant position reordering.** When position changes, reorder siblings atomically.
3. **Image upload.** Use `StorageProvider.upload()` with tenant-prefixed path. Return the public URL.
4. **Redis cache invalidation.** On product update/delete: invalidate `product:{slug}`, `product:{id}`, and any relevant `catalog:list:*` keys for the tenant.
5. **Price in smallest unit.** Always store price in paise (INR) or cents (USD). Never store floating point prices.
6. **Optional inventory.** `track_inventory = false` variants are intentionally outside M04. Cart and order flows must skip reserve/release/decrement calls for them.
7. **Simple products still use variants.** A store that does not manage options should create one default variant with `attributes = '{}'`.
8. **Weight and dimensions are optional.** Leave them null unless a shipping or fulfillment strategy needs them.
9. **3-Tier Authorization.** ALL mutations (create/update/delete) in `catalog.service.ts` must verify:
    - Super Admin: Full platform access.
    - Tenant Admin: Access to all products in tenant.
    - Vendor Staff: Access restricted to products where `vendor_id` matches their own.
9. **Ownership must live in the service layer.** Product, variant, and image writes must accept actor context and re-check ownership even if the route already authenticated the request. Super Admin can mutate all, tenant admin can mutate all rows in the tenant, and vendor-linked users can only mutate products they own.
