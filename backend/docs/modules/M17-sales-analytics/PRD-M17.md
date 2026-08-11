# PRD-M17 — Sales & Analytics

## Objective
Provide high-performance, real-time-ish reporting and revenue tracking for platform administrators (tenant-wide) and individual vendors (vendor-scoped).

## User Stories
- **As a Tenant Admin**, I want to see total platform revenue, top-selling vendors, and overall order trends to manage the platform growth.
- **As a Vendor**, I want to see my daily sales, top products, and pending payouts to manage my business operations.
- **As a System**, I want to perform these calculations without straining the core order processing database during peak sales events.

## Scope & Metrics

### 1. Revenue Metrics
- **Gross Merchandise Value (GMV)**: Subtotal + Tax + Shipping before discounts.
- **Net Revenue**: Total collected (Total in `orders` schema).
- **Vendor Earnings**: sum of `line_total` for items belonging to a specific vendor.
- **Platform Commission**: (Global/Tenant config % of Vendor Earnings) — *Conceptual for Phase 3*.

### 2. Volume Metrics
- Total Orders (Tenant/Vendor scoped).
- Average Order Value (AOV).
- Total Items Sold.

### 3. Product Analytics
- Top 10 Products by revenue/volume.
- Top 10 Categories.

## Hard Rules
- **Tenant Isolation**: No tenant can ever see another tenant's sales data.
- **Vendor isolation**: Vendors can ONLY see metrics for `order_items` where `vendor_id` matches their own.
- **Data Integrity**: Sales data MUST be derived from `order_items` snapshots (R1 rule) to ensure historical accuracy even if product prices change.
- **Soft Deletes**: Sales summaries must exclude orders that are soft-deleted or cancelled (configurable).

## Success Metrics
- Reporting dashboard loads in < 500ms p95.
- Sales summaries are updated within 1 minute of an order being marked as `PAID`.
