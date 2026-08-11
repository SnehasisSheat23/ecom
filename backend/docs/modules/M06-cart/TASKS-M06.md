# TASKS-M06 — Cart

## Prerequisites
- [ ] M02 complete (customer/guest sessions)
- [ ] M03 complete (variants/prices)
- [ ] M04 complete (inventory reservation)
- [ ] M05 complete (shipping calculation)

## Tasks
### T01 — Schema: `carts`, `cart_items`, `saved_for_later_items`
### T02 — Repository: cart CRUD, item management, cache read/write
### T03 — Service: add item (+ reserve inventory), remove (+ release), update quantity
### T04 — Service: cart merge on login (guest → customer)
### T05 — Service: pricing pipeline integration (subtotal, shipping, stubs for discount/tax)
### T06 — Service: checkout initiation (price re-validation, stock check)
### T07 — Coupon + loyalty stubs (return 0, ready for M09/M12 wiring)
### T08 — Delayed cart expiry job (7-day inactivity)
### T08.1 — Document retry/idempotency rules for cart expiry delivery
### T08.2 — Add structured logging around expiry job publish failures
### T09 — Routes: all cart endpoints
### T10 — Tests: merge, pricing, expiry, concurrent adds

## Integration Test
1. Guest adds 2 items → inventory reserved
2. Guest logs in → cart merged with customer account
3. Update quantity → inventory adjusted
4. Remove item → inventory released
5. Apply coupon (stub) → discount = 0
6. Initiate checkout → prices validated, totals correct
