# OpenShutter Catalog Review Notes

## Keep

-   Keep `products` lean.
-   Keep `variants` separate.
-   Keep `inventory` separate.
-   Keep `categories` + `product_categories`.
-   Keep `collections` + `product_collections`.
-   Keep `media_assets`.
-   Keep `price_history`.
-   Keep `sales_channels`.

------------------------------------------------------------------------

## Improve

### Products

-   Move SEO into `product_seo`.
-   Avoid making `products` wider over time.

### Specifications

-   Remove duplicate `specifications JSONB`.
-   Use one normalized specifications system.

### Categories

-   Replace `image_url` with `media_assets` relation.

### Inventory

-   Introduce a `warehouses` table.
-   Inventory should reference `warehouse_id`.

### Marketplace

-   Avoid `products.vendor_id` for future marketplaces.
-   Prefer a `product_vendor_variants` relationship.

### Media

-   Generalize media relationships.
-   Reuse media for:
    -   Products
    -   Categories
    -   Collections
    -   Brands
    -   CMS Pages
    -   Blogs

### Variants

-   Keep variant attributes in JSON for now.
-   Normalize later only if needed.

------------------------------------------------------------------------

## Future Tables

-   brands
-   product_brands
-   product_seo
-   warehouses
-   related_products
-   upsell_products
-   cross_sell_products

------------------------------------------------------------------------

## Architecture Rules

-   Keep tables focused.
-   One responsibility per table.
-   Prefer junction tables over duplicate data.
-   Normalize only when it provides real value.
-   Never add client-specific columns.
-   Prefer modules over custom code.
-   Prefer strategies over `if(client == X)`.
-   Prefer configuration over hardcoded logic.

------------------------------------------------------------------------

## Goal

Build a reusable catalog that supports: - Single Vendor - Marketplace -
Restaurant - Jewelry - Grocery - Fashion

without changing the core schema.
