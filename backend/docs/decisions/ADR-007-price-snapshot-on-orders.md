# ADR-007: Price Snapshots on Orders

**Status:** Accepted
**Date:** 2026-03
**Modules affected:** M07 (orders), M03 (catalog — price source)

## Context

Product prices change over time. An order placed at ₹499 must always show ₹499, even if the product price later changes to ₹599. Joining the catalog table for order pricing produces incorrect historical data.

## Decision

Order items store full price and product metadata snapshots at purchase time. Never join catalog tables for order pricing.

## Alternatives Considered

**Join catalog at read time:**
- ❌ Order totals change when prices change — incorrect
- ❌ Deleted/archived products break order display
- ❌ Variant title/SKU changes alter historical orders
- ✅ Less data duplication
- ✅ Simpler order creation

**Versioned product records:**
- ❌ Complex — need to maintain version history per product
- ❌ Storage intensive for frequently updated catalogs
- ✅ Preserves full product state, not just price

## Consequences

Order items store these snapshot columns:
- `unit_price_snapshot` — price at purchase time
- `product_title_snapshot` — product name at purchase time
- `variant_title_snapshot` — variant name at purchase time
- `sku_snapshot` — SKU at purchase time
- `image_url_snapshot` — product image at purchase time

The `product_id` and `variant_id` FK columns remain for reference/analytics but are never used for pricing or display in order context.

Data Integrity Rule R1 enforces this across all modules.
