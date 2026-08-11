# Phase 1: Catalog Optimization & High-Scale Indexing

## Goal
Optimize the catalog schema for high-volume 100+ tenant multi-tenancy by dropping premature sales channel tables, removing redundant indexes, adding high-performance composite indexes, and standardizing product options.

---

## 1. Multi-Tenant Slug Uniqueness (How Tenant Slugs Work)

### The Question: What if two different tenants have the same product slug?
Example:
- Tenant A sells a product: `slug = "blue-t-shirt"`
- Tenant B ALSO sells a product: `slug = "blue-t-shirt"`

### How it is Handled:
In `catalog.schema.ts`, product slugs are constrained by a **Composite Unique Index**:

```typescript
uniqueIndex('uq_product_slug_tenant').on(table.tenantId, table.slug)
```

- **Database Rule**: Slugs are unique **PER TENANT**, not globally across the platform.
- **Result**: Both Tenant A and Tenant B can use `"blue-t-shirt"` without any conflict.
- **Storefront URL Routing**:
  - `storefront-tenant-a.com/products/blue-t-shirt` $\rightarrow$ Queries `WHERE tenant_id = 'tenant-a' AND slug = 'blue-t-shirt'`.
  - `storefront-tenant-b.com/products/blue-t-shirt` $\rightarrow$ Queries `WHERE tenant_id = 'tenant-b' AND slug = 'blue-t-shirt'`.

---

## 2. Table Cleanup (Dropping Premature Tables)

### Tables to Drop
- **`sales_channels`** (Premature multi-channel feature)
- **`product_publishing`** (Premature junction table)

### SQL Migration Script
```sql
DROP TABLE IF EXISTS product_publishing CASCADE;
DROP TABLE IF EXISTS sales_channels CASCADE;
```

---

## 3. Index Optimizations

### Drop Redundant Duplicate Index
Currently, `products` has two identical indexes on `(tenant_id, slug)`:
1. `uq_product_slug_tenant` (Unique index - required)
2. `idx_products_slug` (Duplicate non-unique index - redundant)

```sql
DROP INDEX IF EXISTS idx_products_slug;
```

### Add High-Performance Storefront Listing Index
The #1 most frequent query across 100+ tenants is: *"List active, approved products for this store, newest first"*.

```sql
CREATE INDEX idx_products_storefront_listing 
ON products (tenant_id, status, approval_status, created_at DESC)
WHERE deleted_at IS NULL;
```

### Add GIN Index for Tag Filtering
Fast filtering for tags (`tags: ["summer-sale", "bestseller"]`) across thousands of products:

```sql
CREATE INDEX idx_products_tags ON products USING GIN (tags);
```

---

## 4. Product Options JSONB & Mandatory Vendor Scoping

### Add `options` JSONB Column
Add an options array on `products` so storefronts can render dropdown pickers (Size, Color):

```typescript
options: jsonb('options')
  .$type<Array<{ name: string; values: string[]; position: number }>>()
  .notNull()
  .default([])
```

### Enforce `vendor_id NOT NULL`
Ensure `vendor_id` is required. In `SINGLE_VENDOR` mode, automatically assign products to the tenant's default vendor entity during creation.

---

## Verification Plan

1. Verify Tenant A and Tenant B can both create products with slug `"blue-t-shirt"` without index violations.
2. Run EXPLAIN ANALYZE on public storefront product queries to verify usage of `idx_products_storefront_listing`.
