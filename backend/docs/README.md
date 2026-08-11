# Nexus Commerce — Documentation

## What Is This

Nexus Commerce is a multi-tenant, provider-agnostic e-commerce backend engine. This `docs/` folder is the single source of truth for architecture, design, and implementation.

## Document Map

| Document | Purpose |
|----------|---------|
| [MASTER-PRD.md](MASTER-PRD.md) | Architecture, principles, payment layer, data model, NFRs |
| [TIMELINE.md](TIMELINE.md) | Build phases, day-by-day plan, milestones |
| [STATUS.md](STATUS.md) | Live build progress dashboard |
| [CONTRACTS.md](CONTRACTS.md) | All cross-module TypeScript interfaces |
| [DEPENDENCY-GRAPH.md](DEPENDENCY-GRAPH.md) | Visual + machine-readable module dependencies |
| [GLOSSARY.md](GLOSSARY.md) | Consistent terminology |
| [STOREFRONT-PRD.md](STOREFRONT-PRD.md) | Next.js storefront spec (Phase 4) |
| [SELF-HOSTING.md](SELF-HOSTING.md) | Self-hosting guide for store owners |

## Module Index

Every module lives in `modules/MXX-{name}/` with:
- `module.json` — Machine-readable metadata (deps, tables, events, status)
- `PRD-MXX.md` — What to build + acceptance criteria
- `DESIGN-MXX.md` — Schema DDL, API contracts, sequence diagrams
- `TASKS-MXX.md` — Atomic dev tasks
- `CHANGELOG.md` — Module-level change history

| ID | Module | Folder | Phase | Layer |
|----|--------|--------|-------|-------|
| M01 | Tenant Management | [M01-tenant-management](modules/M01-tenant-management/) | 1 | Tenancy |
| M02 | Auth & Customers | [M02-auth-customers](modules/M02-auth-customers/) | 1 | Core |
| M03 | Catalog | [M03-catalog](modules/M03-catalog/) | 1 | Core |
| M04 | Inventory | [M04-inventory](modules/M04-inventory/) | 1 | Core |
| M05 | Shipping | [M05-shipping](modules/M05-shipping/) | 1 | Core |
| M06 | Cart | [M06-cart](modules/M06-cart/) | 1 | Core |
| M07 | Orders | [M07-orders](modules/M07-orders/) | 1 | Core |
| M08 | Payments | [M08-payments](modules/M08-payments/) | 1 | Core |
| M09 | Discounts & Coupons | [M09-discounts](modules/M09-discounts/) | 2 | Core |
| M10 | Notifications | [M10-notifications](modules/M10-notifications/) | 2 | Core |
| M11 | Cart Abandonment | [M11-cart-abandonment](modules/M11-cart-abandonment/) | 2 | Core |
| M12 | Loyalty | [M12-loyalty](modules/M12-loyalty/) | 2 | Core |
| M13 | Reviews | [M13-reviews](modules/M13-reviews/) | 2 | Core |
| M14 | Vendors | [M14-vendors](modules/M14-vendors/) | 3 | Vendor |
| M15 | Search | [M15-search](modules/M15-search/) | 3 | Core |
| M16 | Admin (Payload CMS) | [M16-admin](modules/M16-admin/) | 3 | Core |

## Architecture Decision Records

Why key technology choices were made: [decisions/](decisions/)

## For AI Agents

Read `../AGENTS.md` at the repo root. It contains stack info, hard rules, and routing to the right docs for any task.

## Source Conventions

The codebase is expected to follow these structure rules:

- Keep one module per source folder
- Keep one predictable file set per module: `service`, `repository`, `routes`, `schema`, `types`, `validators`, `test`
- Keep layer modules under `src/layers/`
- Keep core business modules under `src/modules/`
- Keep database-backed integration tests under `tests/integration/mXX/`

## Contributing

1. Every schema change gets a CHANGELOG.md entry in the affected module
2. Cross-module interface changes must update `CONTRACTS.md`
3. New technology choices get an ADR in `decisions/`
4. Update `STATUS.md` when module status changes
