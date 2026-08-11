# Nexus Commerce — Master PRD

**This is an architecture reference document.** Module-specific details have been extracted into the module folders at `docs/modules/MXX-*/`.

> **For the full original PRD**, see `../files/nexus-commerce-master-prd-v2.md`.
> That file remains the authoritative source for business context, pricing pipeline, and system architecture.

---

## How To Use This Repository

1. **Start here** for architecture-level decisions (data integrity rules, cross-cutting concerns, NFRs)
2. **Go to module folders** for implementation-level details (`docs/modules/MXX-*/PRD-MXX.md`)
3. **Read CONTRACTS.md** for cross-module TypeScript interfaces
4. **Read AGENTS.md** (repo root) for AI agent instructions and hard rules

## Architecture Reference

The original master PRD covers:

| Section | Topic | Now In |
|---------|-------|--------|
| §1 | Executive Summary | This file (original) |
| §2 | Core Design Principles | This file (original) |
| §3 | System Architecture | This file (original) |
| §4 | Database Layer (Neon Serverless + Drizzle) | ADR-001, ADR-003, ADR-009 |
| §5 | Tenancy Layer | `docs/modules/M01-tenant-management/` |
| §6 | Portability / Self-Hosting | `docs/SELF-HOSTING.md` |
| §7 | Auth & Customers | `docs/modules/M02-auth-customers/` |
| §8 | Payment Layer (provider abstraction) | `docs/modules/M08-payments/`, ADR-006, ADR-007 |
| §9 | Async Layer (QStash + queue adapters) | ADR-004, module-specific queues in each module.json |
| §10 | Data Integrity Rules | Below (duplicated here as master reference) |
| §11 | Module PRDs | `docs/modules/M01–M17/PRD-MXX.md` (individual files) |
| §14 | Sales & Analytics | `docs/modules/M17-sales-analytics/` |
| §12 | NFRs | This file (original) |
| §13 | Caching | Below (duplicated here as master reference) |

## Data Integrity Rules (master reference)

| Rule | Description | Enforced By |
|------|-------------|-------------|
| R1 | Order items store price/title snapshots — never join catalog | M07 order_items schema |
| R2 | Addresses stored as JSONB on orders — not FK | M07 orders schema |
| R3 | Soft deletes — never hard delete entities referenced by orders | M02, M03, M14 schemas |
| R4 | `loyalty_ledger` + `payment_events` are append-only (no UPDATE/DELETE) | DB triggers, ADR-005 |
| R5 | All inventory mutations use `SELECT FOR UPDATE` | M04 repository |
| R6 | Webhook handlers idempotent via `ON CONFLICT DO NOTHING` | M08 payment_events schema |
| R7 | Order placement is one atomic DB transaction | M07 service |
| R8 | Order numbers human-readable, sequential per tenant | M07 repository |
| R9 | All tenant-scoped tables have `tenant_id`; isolation is enforced at app level | All modules, ADR-003 |
| R10 | Cache keys tenant-prefixed: `tenant:{id}:*` | `src/lib/redis-keys.ts` |
| R11 | Queue names tenant-prefixed: `tenant:{id}:*` | `src/lib/queue-names.ts` |

## Caching Strategy (master reference)

### Product & Category Cache (Upstash Redis by default)
- **Product detail** by slug/ID: key `tenant:{tenantId}:product:{slug}`, TTL 1 hour
- **Category tree**: key `tenant:{tenantId}:category:tree`, TTL 1 hour
- **Catalog list** (paginated): key `tenant:{tenantId}:catalog:list:{queryHash}`, TTL 15 min
- **Invalidation**: On any mutation (create/update/delete) → flush affected keys
- **Performance target**: < 100ms p99 for cache hits

### Cart Cache (Upstash Redis by default)
- Key: `tenant:{tenantId}:cart:{cartId}`
- TTL: none (explicit invalidation)
- Updated on every cart mutation
- PostgreSQL is source of truth; cache is read optimization

## Async Delivery Rules (master reference)

- Every async consumer must be idempotent because delivery is at-least-once
- Every queue-using module must define retry behavior explicitly for its own jobs; do not rely only on provider defaults
- Every queue publish failure must be logged with tenant ID, queue name, job name, and job ID
- Every queue-using module must ship at least one integration test covering its async flow end to end
- Queue payloads must stay JSON-serializable and stable across retries

## NFR Summary

| Metric | Target |
|--------|--------|
| API response (cache hit) | < 100ms p99 |
| API response (cache miss) | < 500ms p95 |
| Checkout latency | < 2s total |
| Tenant isolation leakage | Zero (tested) |
| Webhook idempotency | 100% (tested) |
| Order placement atomicity | 100% (tested) |
| Concurrent inventory safety | Proven via SELECT FOR UPDATE |
