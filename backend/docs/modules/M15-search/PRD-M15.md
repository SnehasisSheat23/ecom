# PRD-M15 — Search

**Layer:** Core | **Phase:** 3 | **Estimate:** 1.5 days
**Depends on:** M01, M03 (product data)
**Source:** `src/modules/search/`

---

## Context
Full-text product search via Typesense (see ADR-008). Uses `SearchProvider` interface (CONTRACTS.md §6). Tenant isolation via per-tenant collections. Sync via the async job adapter on product CRUD events.

## V1 Scope
- SearchProvider interface + TypesenseProvider implementation
- Per-tenant collection: `products_{tenantId}`
- Async sync jobs on `product.created`, `product.updated`, `product.deleted`
- Backfill script for initial population
- Search endpoint: `GET /search?q={query}&category={id}&price_min=&price_max=&sort=`
- Faceted results: categories, price ranges
- Typo tolerance

## Out of Scope
- Customer search
- Order search
- Search analytics (popular queries)

<!-- TODO: Expand before Phase 3 -->

## Acceptance Criteria
- [ ] Product created → appears in search within 5 seconds
- [ ] Typo in query → still returns relevant products
- [ ] Faceted filters work (category, price range)
- [ ] Tenant A's products not in tenant B's search
- [ ] Backfill script indexes all existing products
- [ ] Retry policy is documented for each search sync job type
- [ ] Publish failures are logged with tenant and job identifiers
- [ ] Integration test covers product change → async sync handler → Typesense update
