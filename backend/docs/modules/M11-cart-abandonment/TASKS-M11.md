# TASKS-M11 — Cart Abandonment

## Prerequisites
- [ ] M06 Cart complete
- [ ] M10 Notifications complete

## Tasks
### T00 — Define retry/idempotency rules for abandonment jobs
### T01 — Schema: `abandoned_cart_events`
### T02 — Watch cart create/update events → schedule delayed job
### T03 — Handler: if cart still inactive and no order exists, trigger M10 `cart.abandoned`
### T03.1 — Add structured logging for publish failures and handler retries
### T04 — Recovery token + restore endpoint
### T05 — Tests: debounce, recovery, no-op when order already placed

## Integration Test
See TIMELINE.md (M11 section) for done-when criteria.
