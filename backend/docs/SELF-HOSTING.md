# Portability & Self-Hosting Guide

Nexus Commerce is designed to be **Edge-First but Server-Portable**. This means while we default to Cloudflare Workers and Neon Serverless for high performance, you can "eject" to a standard Node.js server environment at any time.

## 1. Current Default Stack (Edge-Native)

- **Runtime**: Cloudflare Workers (via Hono)
- **Database**: Neon Serverless (via `@neondatabase/serverless`)
- **Queue/Cache**: Upstash (QStash & Redis)
- **Deployment**: `npx wrangler deploy`

## 2. Shifting to a Standard Server (Ejection)

If you wish to move from Cloudflare to a standard server (VPS, EC2, Bare Metal), follow these steps:

### A. Runtime Pivot
1.  The codebase is already Hono-based. You can swap `src/worker.ts` for a standard Node.js entry point using `@hono/node-server`.
2.  Your `src/lib/env.ts` already supports `process.env`, so it will pick up your standard `.env` variables automatically.

### B. Database Migration
1.  In Node.js, the `src/lib/db.ts` file automatically detects the environment and attempts to load the `ws` package for Neon compatibility.
2.  If moving to a standard PostgreSQL instance, you can simply use the standard `pg` driver by updating `db.ts` to use a non-serverless Drizzle client.

### C. Infrastructure Swaps
- **Queue**: Swap the QStash adapter for a BullMQ or local Redis adapter.
- **Cache**: Update the cache factory to point to a local Redis instance instead of Upstash.
- **Storage**: Any S3-compatible provider will work (MinIO, AWS S3, etc.).

## 3. Deployment Workflow

### Edge (Cloudflare)
1.  Update `.env`
2.  Run `bash scratch/sync-secrets.sh`
3.  Run `npx wrangler deploy`

### Server (Docker/Node)
1.  Provision a Linux server with Node.js 20+.
2.  Clone the repository and install dependencies.
3.  Run migrations: `npm run migrate`
4.  Start the server: `npm run start` (Requires setting up a Node entry point).

## 4. Portability Guardrails

To ensure you can always "shift later," follow these development rules:
- **Never use Cloudflare-specific globals** directly; wrap them in an abstraction.
- **Use `src/lib/env.ts`** for all environment access.
- **Maintain Drizzle migrations** in `drizzle/migrations/` so they remain provider-agnostic.
