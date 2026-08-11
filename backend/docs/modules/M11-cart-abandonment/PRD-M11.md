# PRD-M11 — Cart Abandonment

**Layer:** Core | **Phase:** 2 | **Estimate:** 1 day
**Depends on:** M01, M06 (carts), M09, M10 (notifications)
**Source:** `src/modules/abandonment/`

---

## Context
Watches carts and triggers abandonment recovery emails when customers leave without purchasing.

## V1 Scope
- On cart create/update: schedule delayed job for X hours (tenant config, default 2hr)
- Job fires: if order placed → no-op; else trigger M10 `cart.abandoned`
- Recovery URL: `/cart/recover?token={cart_token}`
- Cancel/reschedule on cart activity
- Recovery detection: order placed via recovery URL → `recovered = true`
- Log: `abandoned_cart_events (cart_id, triggered_at, recovered_at, recovered BOOLEAN)`

## Out of Scope
- Second reminder / follow-up emails
- Auto-applied discount in abandonment email

<!-- TODO: Expand before Phase 2 -->

## Acceptance Criteria
- [ ] Cart inactive → abandonment email fires after configured delay
- [ ] Order placed before timer → no email
- [ ] Recovery URL restores cart → place order → marked recovered
- [ ] Multiple cart updates → only one final job fires (debounced)
- [ ] Abandonment job delivery is idempotent and safe if the same delayed message is retried
- [ ] Publish failures are logged with tenant and job identifiers
- [ ] Integration test covers update/debounce → delayed handler → notification trigger
