# Catalog Architecture Reference (AI-Agent & Developer Guide)

This document provides a comprehensive technical specification for the **Catalog** module and its sub-modules (including `product-types`) in OpenShutter. It defines database schemas, functional service contracts, policy-based authorization rules, data flow invariants, error codes, and REST API endpoints so that AI agents and engineers can inspect, extend, or consume these modules without parsing the entire codebase.

---

## AI Agent & Developer Directives

> [!IMPORTANT]
> **DOC MAINTENANCE MANDATE**: Whenever catalog service methods, repository queries, validation schemas, product types, or authorization rules are modified, **you MUST update this README file** to keep symbol maps, method contracts, error codes, and line references accurate.

---

## 1. File Map & Directory Structure

```
src/modules/catalog/
├── catalog.schema.ts               # Core database schemas (products, variants, categories, collections)
├── catalog.types.ts                # Core domain types & DTOs
├── catalog.repository.ts           # Data access layer for products, variants, categories, images
├── catalog.service.ts              # Domain business logic & cache manager
├── catalog.routes.ts               # Public & Admin HTTP endpoints
├── catalog.validators.ts           # Zod validation schemas
├── catalog.test.ts                 # Vitest catalog test suite
└── product-types/                  # [SUBFOLDER MODULE] Custom Business Product Classifications
    ├── product-type.schema.ts      # product_types table & AttributeSchemaField interface
    ├── product-type.types.ts       # CatalogProductType, CreateProductTypeInput, DTOs
    ├── product-type.repository.ts  # Drizzle SQL repository for product_types
    ├── product-type.service.ts     # Business logic & AuthorizationService enforcement
    ├── product-type.routes.ts      # REST API endpoints (/product-types, /admin/product-types)
    ├── product-type.validators.ts  # Zod schemas for attribute templates & payloads
    └── product-type.test.ts        # Vitest test suite for product types
```

---

## 2. Product Types Sub-Module Specification (`src/modules/catalog/product-types/`)

The `product-types` sub-module enables tenants and vendors to define top-level business product templates (e.g., Cakes, Flowers, Plants, Apparel, Electronics).

### Database Schema (`product_types` table)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Unique Product Type ID |
| `tenant_id` | `uuid` | `NOT NULL`, FK `tenants(id)` | Tenant Scope |
| `partner_id` | `uuid` | Nullable, FK `vendors(id)` | `NULL` = Tenant Global, `NOT NULL` = Vendor Custom |
| `name` | `varchar(255)` | `NOT NULL` | Display Name (e.g. `"Cakes"`, `"Flowers"`) |
| `slug` | `varchar(255)` | `NOT NULL`, Unique per tenant | URL Slug (e.g. `"cakes"`) |
| `default_product_type` | `varchar(20)` | `NOT NULL`, Default `'physical'` | Default fulfillment type (`'physical'` \| `'digital'`) |
| `attributes_schema` | `jsonb` | `NOT NULL`, Default `'[]'` | Array of `AttributeSchemaField` templates |
| `is_active` | `boolean` | `NOT NULL`, Default `true` | Activation Flag |

### `AttributeSchemaField` Interface
```typescript
export interface AttributeSchemaField {
  key: string              // e.g. "flavour", "isEggless"
  label: string            // e.g. "Flavour", "Eggless Cake"
  type: 'string' | 'number' | 'boolean' | 'select'
  options?: string[]       // e.g. ["Chocolate", "Vanilla"]
  required?: boolean       // false = optional, true = mandatory
}
```

### Authorization Rules
- **Tenant Global Types (`partnerId = null`)**: Created and managed by Tenant Admins or SuperAdmins.
- **Vendor Custom Types (`partnerId = actor.activePartnerId`)**: Created and managed by Vendor Staff.
- Enforced via `auth.assertCanManageProductType({ tenantId, partnerId }, actor)`.

---

## 3. Product Table Integration & High-Performance Indexing

`products` table links to `product_types` via:
- **`product_type_id`**: Foreign Key referencing `product_types(id)`.

### Composite Partial Index for Fast Filtering
```sql
CREATE INDEX idx_products_tenant_product_type 
ON products (tenant_id, product_type_id, status, approval_status, created_at)
```
Enables sub-millisecond filtering when querying products by business class (`GET /products?productTypeId=...`).

---

## 4. Multi-Currency Variant Pricing Architecture (`variant_prices` table)

Variant pricing is managed via `variant_prices`, decoupling pricing per currency code while maintaining backward compatibility for single-currency tenants.

### Database Schema (`variant_prices` table)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key | Unique Price Entry ID |
| `tenant_id` | `uuid` | `NOT NULL`, FK `tenants(id)` | Tenant Scope |
| `variant_id` | `uuid` | `NOT NULL`, FK `variants(id)` ON DELETE CASCADE | Product Variant Link |
| `currency_code` | `varchar(3)` | `NOT NULL` | Currency Code (e.g. `'USD'`, `'EUR'`, `'INR'`) |
| `price` | `integer` | `NOT NULL` | Price in lowest currency unit (cents/paisa) |
| `compare_at_price` | `integer` | Nullable | Original compare-at strike price |
| `cost_per_item` | `integer` | Nullable | Cost of goods for merchant accounting |

### Indexing & Unique Constraints
- **Unique Currency Index**: `UNIQUE(tenant_id, variant_id, currency_code)`
- **Fast Filter Index**: `CREATE INDEX idx_variant_prices_lookup ON variant_prices(tenant_id, currency_code, price)`


---

## 4. REST API Endpoint Reference

### Public Storefront Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/products` | List active & approved products (Supports `productTypeId`, `categorySlug`, `search`) |
| `GET` | `/products/:slug` | Get public product details by slug |
| `GET` | `/product-types` | List active product types for tenant |
| `GET` | `/product-types/:slug` | Get public product type details by slug |

### Protected Admin / Vendor Endpoints
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/admin/product-types` | Admin / Vendor Staff | Create product type template |
| `PATCH` | `/admin/product-types/:id` | Admin / Vendor Staff | Update product type template |
| `DELETE` | `/admin/product-types/:id` | Admin / Vendor Staff | Delete product type template |
| `GET` | `/admin/product-types` | Admin / Vendor Staff | List product types with vendor filter |
| `POST` | `/admin/products` | Admin / Vendor Staff | Create product with optional `productTypeId` |
| `PATCH` | `/admin/products/:id` | Admin / Vendor Staff | Update product and `productTypeId` |

---

## 5. System Error Codes Reference

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `product-type-not-found` | 404 | Product type ID or slug does not exist in tenant. |
| `product-type-slug-conflict` | 409 | Product type slug already taken in tenant. |
| `forbidden` | 403 | Insufficient permissions to access or manage resource. |
| `category-depth-exceeded` | 400 | Attempted to create category deeper than 3 levels. |
| `category-cycle` | 400 | Attempted to set category parent to an ancestor cycle. |
