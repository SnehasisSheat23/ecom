# TASKS-M03 — Catalog

## Prerequisites
- [ ] M01 Tenant Management complete
- [ ] StorageProvider interface defined (`src/providers/storage/storage.interface.ts`)

## Tasks

### T01 — Schema
**File:** `catalog.schema.ts`
**What:** All 6 tables — products, variants, categories, product_images, product_categories, price_history.
**Acceptance:** Migration applies. All constraints and indexes present.

### T02 — Types & Validators
**Files:** `catalog.types.ts`, `catalog.validators.ts`
**What:** Interfaces + Zod schemas for all CRUD operations.
**Acceptance:** Price validated as positive integer. Slug format validated.

### T03 — Repository
**File:** `catalog.repository.ts`
**What:** All queries — product CRUD, variant CRUD, category tree, image management, price history inserts.
**Acceptance:** Public queries filter `status = active` and `deleted_at IS NULL`.

### T04 — StorageProvider Implementation
**File:** `src/providers/storage/s3.provider.ts`
**What:** Implement `StorageProvider` interface for S3/R2 — upload, delete, getSignedUrl.
**Acceptance:** Can upload a file to R2 and get a public URL. Path is tenant-prefixed.

### T05 — Service (Products)
**File:** `catalog.service.ts`
**What:** Create product (with initial variant), update, soft delete, list (paginated), get by slug. Price change → price_history insert. Cache invalidation on mutation.
**Acceptance:** Product with variants returned. Price history logged. Cache cleared.

### T06 — Service (Categories)
**File:** `catalog.service.ts`
**What:** Category CRUD, tree builder, depth validation (max 3).
**Acceptance:** Depth > 3 rejected. Tree returned as nested structure.

### T07 — Service (Images)
**File:** `catalog.service.ts`
**What:** Upload image via StorageProvider, associate with product/variant, delete.
**Acceptance:** File uploaded to R2. URL stored in `product_images`.

### T08 — Admin Routes
**File:** `catalog.routes.ts`
**What:** All admin endpoints per API contracts.
**Acceptance:** All product/variant/category/image CRUD endpoints functional.

### T09 — Public Routes
**File:** `catalog.routes.ts`
**What:** GET /products, GET /products/:slug, GET /categories, GET /categories/:slug/products.
**Acceptance:** Only active, non-deleted products returned. Tenant-scoped.

### T10 — Redis Caching
**What:** Cache product detail and category tree lookups. Invalidate on mutations.
**Acceptance:** Second request for same product hits Redis. Update clears cache.

### T11 — Unit Tests
**File:** `catalog.test.ts`
**What:** CRUD tests, slug uniqueness, soft delete, price history, category depth, cross-tenant isolation.
**Acceptance:** All tests pass.

## Integration Test
1. Create product with 3 variants and 2 images
2. Assign to 2 categories
3. Public listing shows product
4. Update price → price_history entry created
5. Soft delete → gone from public, still in admin
6. Category depth 4 → rejected
7. Cross-tenant: tenant A's products not visible to tenant B

## Edge Case Checklist
- [ ] Duplicate slug → 409
- [ ] Delete last variant → 400
- [ ] Delete category with products → 400
- [ ] Image > 5MB → 400
- [ ] Access archived product publicly → 404
- [ ] Price history logged on every price change
