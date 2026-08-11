# ADR-005: Append-Only Ledgers

**Status:** Accepted
**Date:** 2026-03
**Modules affected:** M08 (payment_events), M12 (loyalty_ledger)

## Context

Financial and points data must be auditable, tamper-proof, and correctly computable at any point in time. Mutable balance columns drift from reality when bugs, race conditions, or failed transactions occur.

## Decision

Use append-only ledger tables for all money and points tracking. Balance is always computed as `SUM(delta)`, never stored as a mutable column.

## Alternatives Considered

**Mutable balance column:**
- ❌ Race conditions on concurrent updates
- ❌ No audit trail — you can't answer "how did the balance get here?"
- ❌ Bugs that update incorrectly leave corrupted balances with no recovery path
- ✅ Simpler queries (`SELECT balance FROM ...`)
- ✅ Faster reads (no aggregation)

## Consequences

- `loyalty_ledger` and `payment_events` tables: `INSERT` only. DB triggers reject `UPDATE` and `DELETE`.
- Balance query: `SELECT SUM(delta) FROM loyalty_ledger WHERE customer_id = ? AND tenant_id = ? AND (expires_at IS NULL OR expires_at > NOW())`
- Voiding points = inserting a negative delta row, not deleting original
- Refunds = inserting a new payment event, not updating original
- Read performance at scale: add a materialized view or cached balance if `SUM()` becomes slow (not expected until millions of rows per customer)
- Every entry has `created_at` — full audit trail for any balance
