# ADR-003: Application-Level Filtering over Session-State RLS

**Status:** Accepted
**Date:** 2026-03
**Modules affected:** M01 (tenant middleware), all tenant-scoped tables

## Context

Multi-tenant system needs data isolation. Two approaches: filter by `tenant_id` in every query (application-level), or enforce isolation at the database layer via PostgreSQL Row-Level Security.

## Decision

Use explicit application-level tenant filtering. Every tenant-scoped repository method must accept `tenantId` and include it in the query predicate.

## Alternatives Considered

**Session-state RLS with `SET LOCAL`:**
- ❌ Breaks under transaction-pooled connections unless requests are forced into one open transaction
- ❌ Adds operational coupling between middleware order, connection state, and pooler behavior
- ✅ Database-enforced when the session context is present
- ✅ Good fit for direct/session connections

**Schema-per-tenant:**
- ❌ Operational nightmare at 100+ tenants
- ❌ Migration management across N schemas
- ✅ True isolation (no chance of cross-tenant queries)

## Consequences

- Tenant middleware only resolves tenant and stores `TenantContext` on the request
- Services and repositories must receive `tenantId` explicitly for every tenant-scoped operation
- Queries on tenant tables must include `tenant_id` in the predicate for reads, writes, and deletes
- **Safety Net Removal**: Database-level isolation (RLS) is disabled. Data isolation now depends entirely on **repository discipline**.
- **Mandatory Testing**: Every module must have integration tests to verify that cross-tenant queries return no data.
