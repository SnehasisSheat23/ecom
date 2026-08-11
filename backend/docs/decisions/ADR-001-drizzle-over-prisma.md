# ADR-001: Drizzle ORM over Prisma

**Status:** Accepted
**Date:** 2026-03
**Modules affected:** All (every module uses Drizzle for DB access)

## Context

Need a TypeScript ORM for PostgreSQL that produces predictable SQL, integrates with manual migrations, and supports flexible multi-tenant query building.

## Decision

Use Drizzle ORM.

## Alternatives Considered

**Prisma:**
- ❌ Inflexible query engine — harder to enforce manual tenant filters consistently compared to Drizzle's SQL-like syntax.
- ❌ Generates opaque SQL — harder to debug and optimize
- ❌ Schema-first with its own migration system — conflicts with our need for manual migration control
- ❌ Heavy client generation step
- ✅ Better documentation and ecosystem
- ✅ More popular (more StackOverflow answers)

**Raw SQL (no ORM):**
- ❌ No type safety
- ❌ Manual result mapping is tedious and error-prone
- ✅ Full control

## Consequences

- Must write raw SQL for some complex queries (Drizzle supports this)
- Schema defined in TypeScript files (`*.schema.ts`), not in a Prisma schema file
- Migrations generated via `drizzle-kit generate` and applied via `drizzle-kit push` or manual SQL
- All modules follow the same pattern: Drizzle schema → repository → service
