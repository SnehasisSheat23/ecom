# ADR-009: Edge-Native Architecture (Cloudflare Workers + Neon)

**Status:** Accepted
**Date:** 2026-04
**Modules affected:** All (Global Runtime)

## Context

The original architecture was designed for a standard Node.js/Postgres environment. However, to achieve < 100ms global latency and reduce infrastructure overhead, the project has pivoted to a serverless Edge-native stack. This requires specific changes to how we handle environment variables, database connections, and cryptography.

## Decision

Adopt Cloudflare Workers as the primary runtime and Neon Serverless Postgres as the primary database.

1.  **Runtime**: Use Hono on Cloudflare Workers.
2.  **Database**: Use `@neondatabase/serverless` with WebSocket support for transactions. Standard `pg` is used only in Node.js environments (migrations/local CLI).
3.  **Auth**: Replace CPU-intensive `bcrypt` with native Web Crypto PBKDF2. This ensures we stay within the 50ms execution limit of Cloudflare Workers.
4.  **Environment**: Use a custom `env.ts` utility to abstract the difference between `process.env` (Node) and the `env` object (Workers).

## Alternatives Considered

- **Standard Node.js / EC2**: Higher operational cost and higher latency for global users.
- **Supabase**: Good alternative, but Neon + Drizzle provides more control over the schema and tenancy logic without being tied to a specific provider's RLS.

## Consequences

- **Latency**: Sub-100ms response times globally.
- **Complexity**: Environment variables must be synced to Cloudflare Secrets via `npx wrangler secret put`.
- **Maintenance**: No servers to patch; all infrastructure is managed and serverless.
- **Portability**: The code remains Node-compatible via polyfills and the `env` abstraction, allowing for a pivot back to standard servers if needed.
