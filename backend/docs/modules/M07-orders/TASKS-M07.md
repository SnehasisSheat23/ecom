# TASKS-M07 — Orders

## Prerequisites
- [ ] M01–M06 complete

## Tasks
### T01 — Schema: `orders`, `order_items`, `order_sub_orders` + order number sequence
### T02 — Repository: order CRUD, human order number generation, item snapshot insertion
### T03 — Service: `placeOrder()` — full 10-step atomic transaction
### T04 — Service: order status state machine with valid transitions
### T05 — Service: order cancellation (restore inventory, void loyalty)
### T06 — Service: guest order tracking by token
### T07 — Customer routes: place, list, detail, cancel
### T08 — Admin routes: list, status update
### T09 — Guest route: track by token
### T10 — Tests: atomic rollback, snapshot integrity, concurrent placement, status transitions

## Integration Test
1. Cart with items → place order → inventory sold, cart converted, payment_intent created
2. Verify order_items have snapshot values (change product price → order total unchanged)
3. Guest places order → tracks via token
4. Cancel PENDING order → inventory restored
5. Try SHIPPED → PENDING → rejected (invalid transition)
6. Concurrent placement for last item → only one succeeds

## Edge Case Checklist
- [ ] Empty cart → 400
- [ ] Out of stock at placement time → 400 (even if was available when added)
- [ ] Guest order without email → 400
- [ ] Cancel SHIPPED order → 400
- [ ] Order number increments correctly across multiple orders
