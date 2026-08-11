# Collections Architecture & Developer Reference

The **Collections** module manages marketing groupings (e.g. *Best Sellers*, *Diwali Offers*, *Summer Sale*) in OpenShutter.

---

## 1. Core Principles

- **Marketing Groupings**: Collections answer *"How do I want to group or promote this product?"*.
- **Independent Flat Structure**: Simple non-hierarchical marketing lists.
- **Display Control**: Supports `display_type` (`'TREE' | 'GRID' | 'LIST'`) default `'GRID'`.
- **Actor Audit Tracking**: Captures `created_by` and `updated_by` on all mutations.

---

## 2. Database Schema (`collections` & `product_collections`)

```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  display_type VARCHAR(20) NOT NULL DEFAULT 'GRID',
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_collection_slug_tenant UNIQUE (tenant_id, slug)
);

CREATE TABLE product_collections (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, collection_id)
);
```

---

## 3. REST API Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/collections` | Public | List active marketing collections |
| `GET` | `/collections/:slug` | Public | Get collection details by slug |
| `POST` | `/admin/collections` | Store Admin | Create new collection |
| `PATCH` | `/admin/collections/:id` | Store Admin | Update collection |
| `DELETE` | `/admin/collections/:id` | Store Admin | Delete collection |
