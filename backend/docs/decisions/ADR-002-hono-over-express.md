# ADR-002: Hono over Express

**Status:** Accepted
**Date:** 2026-03
**Modules affected:** All route files, middleware

## Context

Need a Node.js HTTP framework that is lightweight, supports middleware composition, and can run on edge runtimes if needed later.

## Decision

Use Hono.

## Alternatives Considered

**Express:**
- ❌ Heavy, legacy API
- ❌ No native TypeScript support
- ❌ Middleware patterns are verbose
- ❌ Not designed for edge runtimes
- ✅ Massive ecosystem
- ✅ Every developer knows it

**Fastify:**
- ❌ Plugin system adds complexity
- ❌ Schema validation is JSON Schema based (we use Zod)
- ✅ Great performance
- ✅ Good TypeScript support

## Consequences

- Smaller ecosystem — fewer off-the-shelf middleware packages
- Routes defined via `Hono` app instances per module, composed at top level
- Context-based middleware (`c.set()`, `c.get()`) for tenant context injection
- Can deploy to Cloudflare Workers, Vercel Edge, or plain Node.js without changes
