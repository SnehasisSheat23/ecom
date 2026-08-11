# DESIGN-M17 — Sales & Analytics

## File Map
| File | Purpose |
|------|---------|
| `sales.schema.ts` | `sales_daily_summary`, `sales_vendor_stats` tables |
| `sales.repository.ts` | Optimized SQL for daily/weekly/monthly aggregations |
| `sales.service.ts` | Business logic for updating summaries on OrderPaid event |
| `sales.routes.ts` | Admin + Vendor analytics endpoints |
| `sales.worker.ts` | QStash handler for async pre-aggregation |

## DDL (Optimized for performance)
```sql
CREATE TABLE sales_daily_summary (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  vendor_id         UUID, -- NULL for total platform stats
  summary_date      DATE NOT NULL,
  total_revenue     INTEGER NOT NULL DEFAULT 0, -- in cents
  total_orders      INTEGER NOT NULL DEFAULT 0,
  total_items_sold  INTEGER NOT NULL DEFAULT 0,
  gross_margin      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sales_tenant_vendor_date UNIQUE (tenant_id, vendor_id, summary_date)
);

-- Index for fast time-series lookups
CREATE INDEX idx_sales_query ON sales_daily_summary(tenant_id, vendor_id, summary_date DESC);
```

## Performance Strategy

### 1. Pre-Aggregation (Asynchronous)
To maintain "Fast and Optimized" metrics:
- **OrderPaidEvent**: When an order is paid, M07 emits a `sales.update` job to QStash.
- **Worker Logic**: The worker increments the `total_revenue`, `total_orders`, and `total_items_sold` in `sales_daily_summary` using an `ON CONFLICT DO UPDATE` query.
- **Benefit**: Dashboard queries become a simple range scan on `sales_daily_summary` (usually < 100 rows per query) rather than a table scan on millions of `order_items`.

### 2. No-Join Policy
Queries MUST NOT join the `products` table for reporting:
- **Product Names/Categories**: All names and categories are pulled from `order_items.product_title_snapshot` and `order_items.metadata`.
- **Reason**: Reporting should reflect the state at the time of sale, avoiding performance hits from joining large catalog tables.

### 3. Strict Tenant & Vendor Isolation
```typescript
class SalesRepository {
  async getDashboardStats(tenantId: string, vendorId?: string, startDate: Date, endDate: Date) {
    return db.select()
      .from(salesDailySummary)
      .where(
        and(
          eq(salesDailySummary.tenantId, tenantId),
          vendorId ? eq(salesDailySummary.vendorId, vendorId) : isNull(salesDailySummary.vendorId),
          between(salesDailySummary.summaryDate, startDate, endDate)
        )
      )
      .orderBy(desc(salesDailySummary.summaryDate));
  }
}
```

## Scaling for High Volume
If a tenant grows to millions of orders per day:
1. **Materialized Views**: Use Postgres materialized views with concurrent refresh for hourly stats.
2. **Typesense Analytics**: For complex drill-downs (e.g., "sales by city AND category"), sync summary data to Typesense to offload analytical queries from the primary Postgres instance.
3. **HyperLogLog**: For "unique customers" metrics, use HLL in Postgres to approximate counts with fixed memory usage.

## Known Gotchas
1. **Refunds & Cancellations**: An `OrderRefundedEvent` must decrement the summary tables. Use `ON CONFLICT DO UPDATE` to ensure idempotency.
2. **Historical Re-calculation**: If the aggregation logic changes, a "re-sync" script is needed to re-aggregate from `order_items`. This should be run during off-peak hours with a limited concurrency rate.
