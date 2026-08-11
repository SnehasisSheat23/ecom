# ADR-008: Typesense over Elasticsearch

**Status:** Accepted
**Date:** 2026-03
**Modules affected:** M15 (search)

## Context

Need full-text product search with faceted filtering, typo tolerance, and tenant isolation. Must be self-hostable and affordable to run alongside the main application.

## Decision

Use Typesense (self-hosted).

## Alternatives Considered

**Elasticsearch:**
- ❌ Heavy — requires significant RAM (2GB+ minimum)
- ❌ Complex cluster management
- ❌ JVM-based — operational overhead
- ❌ Expensive managed options (Elastic Cloud, AWS OpenSearch)
- ✅ Industry standard, massive ecosystem
- ✅ More advanced query capabilities (aggregations, nested objects)

**Meilisearch:**
- ❌ Less mature faceted search
- ❌ Smaller community
- ✅ Similar philosophy to Typesense (lightweight, easy)
- ✅ Good performance

**PostgreSQL full-text search (tsvector):**
- ❌ No typo tolerance
- ❌ Faceted filtering requires complex queries
- ❌ Adds load to primary database
- ✅ No additional service to manage

## Consequences

- Typesense runs as a single binary on Railway (same service or dedicated)
- Tenant isolation via separate collections: `products_{tenantId}`
- Sync via async jobs on product create/update/delete
- Backfill script needed for initial index population
- At 30+ tenants, move Typesense to its own Railway service
- At 100+ tenants, consider Typesense Cloud or self-hosted cluster
- See `SearchProvider` interface in `docs/CONTRACTS.md` §6
