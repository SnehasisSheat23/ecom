# Categories Architecture & Developer Reference

The **Categories** module manages single-table hierarchical classification of products in OpenShutter.

---

## 1. Core Principles

- **Logical Classification**: Categories answer *"What is this product?"* (e.g. `Jewelry -> Rings -> Diamond`).
- **Single Self-Referencing Table**: Uses `parent_id` linking to `categories.id`. Supports 0 to unlimited depth hierarchy.
- **Display Control**: Supports `display_type` (`'TREE' | 'GRID' | 'LIST'`) for frontend rendering strategy.
- **Actor Audit Tracking**: Captures `created_by` and `updated_by` on all mutation operations.

---

## 2. Database Schema (`categories` & `product_categories`)

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  parent_id UUID REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  display_type VARCHAR(20) NOT NULL DEFAULT 'TREE',
  level INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_category_slug_tenant UNIQUE (tenant_id, slug)
);

CREATE TABLE product_categories (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
```

---

## 3. REST API Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/categories?tree=true` | Public | Get hierarchical tree of categories |
| `GET` | `/categories/:slug` | Public | Get category details by slug |
| `POST` | `/admin/categories` | Store Admin | Create new category |
| `PATCH` | `/admin/categories/:id` | Store Admin | Update category (name, parent, displayType, sortOrder) |
| `DELETE` | `/admin/categories/:id` | Store Admin | Delete category & unparent children |
