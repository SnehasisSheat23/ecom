# PRD-M03 — Catalog

**Layer:** Core | **Phase:** 1 | **Estimate:** 3 days
**Depends on:** M01 (tenant context)
**Required by:** M04 (inventory for tracked variants), M06 (cart items), M07 (order items), M15 (search index)
**Source:** `src/modules/catalog/`

---

## Context

The catalog is the product database. Every product has one or more variants (purchasable units with SKU, price, and optional inventory tracking). Products are organized into a category tree. Images are stored in S3-compatible storage (R2). This is the most-read module — public storefront endpoints serve catalog data on every page.

## V1 Scope

### Products
- `title, slug (unique per tenant), description (HTML), short_description`
- `status`: `draft` | `active` | `archived`
- `product_type`: `physical` | `digital`
- SEO: `meta_title, meta_description, canonical_url`
- `vendor_id FK` (nullable — for multi-vendor tenants)
- Soft delete via `deleted_at` — archived products visible on historical orders
- Redis caching: cache product details by slug/ID with 1-hour TTL, invalidated on update

### Variants
- Every purchasable unit is a variant; simple products have one default variant
- `sku (unique per tenant), title, price, compare_at_price, position, is_default`
- `attributes JSONB`: `{ "size": "L", "color": "Blue" }`
- Default variants may use empty `attributes = {}`
- `track_inventory BOOLEAN NOT NULL DEFAULT true`
- `weight_grams, length_mm, width_mm, height_mm` are optional and only needed by shipping strategies that require physical dimensions
- Variant-level image association
- `track_inventory = false` means the variant is sellable without any inventory row or stock reservation

### Categories
- Nested tree via `parent_id`, max depth 3
- `name, slug, description, image_url, position, is_active`
- Redis caching: cache category tree and individual category metadata; invalidated on change

### Images
- Upload to R2 via `StorageProvider` interface
- `url, alt_text, position` per image
- Multiple images per product, ordered by position

### Price History (schema hook — write from day 1)
- Append-only table: `variant_id, old_price, new_price, changed_at, changed_by`

## Out of Scope

- Digital product delivery / download URLs
- Product bundles
- Custom attributes schema
- Bulk import/export (CSV)
- Product comparison

## API Contracts

### Admin Endpoints
```
POST   /admin/products                — Create product with variants
GET    /admin/products                — List products (paginated, filterable)
GET    /admin/products/:id            — Get product with variants
PATCH  /admin/products/:id            — Update product
DELETE /admin/products/:id            — Soft delete
POST   /admin/products/:id/variants   — Add variant
PATCH  /admin/variants/:id            — Update variant
DELETE /admin/variants/:id            — Soft delete variant
POST   /admin/products/:id/images     — Upload image
DELETE /admin/images/:id              — Delete image
POST   /admin/categories              — Create category
PATCH  /admin/categories/:id          — Update category
DELETE /admin/categories/:id          — Delete category (must have no products)
```

### Public Storefront Endpoints
```
GET    /products                      — List active products (paginated)
GET    /products/:slug                — Get product by slug (with variants, images)
GET    /categories                    — Category tree
GET    /categories/:slug/products     — Products in category (paginated)
```

## Business Logic Rules

1. Product slug must be unique within the tenant
2. Variant SKU must be unique within the tenant
3. Every product must have at least one variant — cannot delete the last variant
4. `track_inventory = false` means the variant does not participate in M04 reservation/decrement flows
5. `track_inventory = true` means the variant must have exactly one inventory row in M04
6. Soft-deleted products excluded from public listings but visible on orders
7. Category max depth 3 — reject deeper nesting
8. Cannot delete a category that has products assigned
9. Price change on variant → insert into `price_history`
10. Product create/update/delete emits event for M15 search sync
11. Public endpoints return only status = `active` products where `deleted_at IS NULL`
12. Redis cache invalidated on any product/category mutation

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Duplicate slug same tenant | 409 Conflict |
| Delete product with orders | Soft delete — stays in DB for order references |
| Delete last variant | 400 — product must have at least one variant |
| Default variant with empty attributes | Valid for simple stores |
| Variant with `track_inventory = false` | Sellable without stock checks or reservation |
| Variant without weight/dimensions | Valid unless a shipping method requires them |
| Category depth > 3 | 400 — max depth exceeded |
| Delete category with products | 400 — reassign products first |
| Update price on variant | Old/new price logged to `price_history` |
| Upload image > 5MB | 400 — max size exceeded |
| Access archived product via slug | 404 on public, visible on admin |

## Cross-Module Interactions

| Direction | Module | What |
|-----------|--------|------|
| **Called by** | M04 | Variant lookup for tracked inventory only |
| **Called by** | M06 | Variant lookup + price for cart items |
| **Called by** | M07 | Product/variant snapshot for order items |
| **Called by** | M15 | Product data for search indexing |
| **Emits to** | M15 | `product.created`, `product.updated`, `product.deleted` events |
| **Uses** | Storage Provider | Image upload/delete |

## Schema Hooks

| Column | Purpose | Activate When |
|--------|---------|---------------|
| `tax_class` on products | Tax category classification | Tax module |
| `weight_grams, length_mm, width_mm, height_mm` on variants | Carrier-based shipping | Carrier shipping |
| `vendor_commission_override` on products | Per-product commission rate | Vendor payouts |

## Acceptance Criteria

- [ ] Create a product with 3 variants and 2 categories via API
- [ ] Create a simple product with a default variant and `track_inventory = false`
- [ ] Soft delete a product — disappears from public listing, stays in DB
- [ ] Upload image to R2, URL stored in `product_images`
- [ ] Public listing returns only active products for correct tenant
- [ ] Cross-tenant test: tenant A cannot see tenant B's products
- [ ] Price change creates `price_history` entry
- [ ] Category tree renders correctly with 3 levels
- [ ] Product slug unique per tenant enforced
- [ ] Tracked variants can be handed off to M04; untracked variants do not require an inventory row
- [ ] Redis cache hit returns same data as DB, cache invalidated on update
