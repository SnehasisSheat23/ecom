# PRD-M12 — Loyalty

**Layer:** Core | **Phase:** 2 | **Estimate:** 1.5 days
**Depends on:** M01, M02 (customers), M07 (orders), M10 (notifications)
**Source:** `src/modules/loyalty/`

---

## Context
Append-only loyalty points ledger. Earn on delivery, redeem at checkout. Balance = `SUM(delta)` where not expired. See ADR-005.

## V1 Scope
- `loyalty_ledger` table: `customer_id, delta, type (earn|redeem|void), order_id, expires_at, created_at`
- Earn: `order_total * tenant.config.earn_rate` points on `order.delivered`
- Redeem: deduct at checkout, `redeem_rate` from tenant config (₹1 per N points)
- Points expire after 365 days via `expires_at`
- Void: negative delta on order cancellation
- Balance endpoint: `GET /loyalty/balance`
- History endpoint: `GET /loyalty/history`
- Stacking rule with coupons handled at cart level (M06)

## Out of Scope
- Loyalty tiers (Bronze/Silver/Gold)
- Points for reviews / referrals
- Points transfer between customers

<!-- TODO: Expand DDL, edge cases before Phase 2 -->

## Acceptance Criteria
- [ ] Order delivered → points earned = `total * earn_rate`
- [ ] Redeem at checkout → balance deducted, order total reduced
- [ ] Order cancelled → points voided (negative delta)
- [ ] Expired points excluded from balance
- [ ] Append-only: no UPDATE or DELETE on loyalty_ledger
