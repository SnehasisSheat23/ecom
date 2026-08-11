# TASKS-M04 — Inventory

## Prerequisites
- [ ] M01 complete
- [ ] M03 schema stable (variant IDs)

## Tasks

### T01 — Schema: `inventory`, `inventory_history` tables
### T02 — Repository: All mutations with SELECT FOR UPDATE
### T03 — Service: reserve, release, permanentDecrement, restoreOnCancellation, adjustStock
### T04 — Delayed release job adapter: schedule on reserve, cancel on release/decrement
### T04.1 — Define retry/idempotency rules for delayed release delivery
### T04.2 — Add structured logging for publish/cancel failures
### T05 — Admin routes: list inventory, adjust stock, view history
### T06 — Unit tests: concurrency test (Promise.all for last unit)

## Future Tasks

### F01 — Add `inventory_reservations` table for per-cart reservation persistence
### F02 — Verify scheduled release jobs against reservation row ownership before restore
### F03 — Add integration tests with real Postgres + queue-consumer-backed delayed release flow
### F04 — Wire M03 tracked-variant creation to `createInventoryForTrackedVariant()`
### F05 — Wire QStash adapter in serverless runtime and keep BullMQ adapter optional

## Integration Test
1. Create variant with stock = 5
2. Reserve 3 → available = 2, reserved = 3
3. Release 1 → available = 3, reserved = 2
4. Permanent decrement 2 → available = 3, reserved = 0, sold = 2
5. Cancel order → restore 2 → available = 5, sold = 0
6. Check inventory_history has 4 entries

## Edge Case Checklist
- [ ] Concurrent last-unit reservation → only one succeeds
- [ ] Release after order placed → no-op (reservation already consumed)
- [ ] Backorder: reserve with 0 stock + allow_backorder → succeeds
