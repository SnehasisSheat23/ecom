# ADR-004: QStash (Serverless HTTP Queue) over BullMQ/pg-boss

**Status:** Accepted
**Date:** 2026-04
**Modules affected:** M04 (inventory release), M06 (cart expiry), M10 (notifications), M11 (abandonment), M15 (search sync)

## Context

Need an async delivery layer for serverless Hono deployments: notifications, cart abandonment emails, inventory reservation release, payment follow-ups, and search sync. It must support delayed delivery, retries, dead letter queues, deduplication, and tenant-safe naming without requiring always-on workers.

## Decision

Use Upstash QStash as the default queue and scheduler for the serverless runtime.

Preserve portability by keeping queue usage behind an application-level adapter:
- job names and queue names stay tenant-prefixed
- module services depend on queue interfaces, not QStash SDK calls
- payloads stay JSON-serializable and idempotent
- a BullMQ adapter can be introduced later without changing module business logic

## Alternatives Considered

**BullMQ + Redis:**
- ✅ Mature worker model with strong local/dev ergonomics
- ✅ Good fit for long-lived Node processes
- ❌ Less natural fit for serverless Hono because delayed jobs and retries assume persistent Redis-backed workers
- ❌ Adds operational burden when we do not want a separate worker fleet in the first deployment shape
- ❌ Still requires application code to own worker hosting, backpressure, and graceful restarts

**pg-boss:**
- ✅ Transactional enqueue with PostgreSQL
- ✅ Simpler than introducing another data store
- ❌ Adds polling load to the primary database
- ❌ Less aligned with our serverless HTTP-first deployment target

**Agenda (MongoDB-based):**
- ❌ Requires MongoDB — we don't use it
- ❌ Different from our DB stack

## Consequences

- Default async transport is HTTP-based and serverless-friendly
- Delayed jobs, retries, and DLQ behavior are delegated to QStash rather than an in-process worker runtime
- All queue names remain tenant-prefixed: `tenant:${tenantId}:queue-name`
- Every consumer endpoint must be idempotent because delivery is at-least-once
- If the DB transaction commits but publish fails, work can still be lost; mitigate with idempotent handlers, retryable publish code, and reconciliation for critical flows
- Local development can use noop/in-memory adapters first, then BullMQ or QStash adapters as needed
- BullMQ remains an intentional future option for non-serverless deployments, but it is no longer the architectural default
