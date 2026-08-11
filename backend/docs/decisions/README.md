# Architecture Decision Records

Index of all architecture decisions for Nexus Commerce.

| ADR | Decision | Status |
|-----|----------|--------|
| [ADR-001](ADR-001-drizzle-over-prisma.md) | Drizzle ORM over Prisma | Accepted |
| [ADR-002](ADR-002-hono-over-express.md) | Hono over Express | Accepted |
| [ADR-003](ADR-003-app-level-tenant-filtering.md) | App-level filtering over session-state RLS | Accepted |
| [ADR-004](ADR-004-bullmq-over-pg-boss.md) | QStash over BullMQ/pg-boss | Accepted |
| [ADR-005](ADR-005-append-only-ledgers.md) | Append-only ledgers for money | Accepted |
| [ADR-006](ADR-006-payment-provider-abstraction.md) | Payment provider abstraction layer | Accepted |
| [ADR-007](ADR-007-price-snapshot-on-orders.md) | Price snapshots on order items | Accepted |
| [ADR-008](ADR-008-typesense-over-elasticsearch.md) | Typesense over Elasticsearch | Accepted |

## ADR Format

Each record follows:
- **Status:** Accepted / Superseded / Deprecated
- **Date:** When decided
- **Context:** Problem being solved
- **Decision:** What was chosen
- **Alternatives Considered:** What was rejected and why
- **Consequences:** Tradeoffs accepted
