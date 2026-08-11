# PRD-M09 — Discounts & Coupons

**Layer:** Core | **Phase:** 2 | **Estimate:** 1.5 days
**Depends on:** M01
**Required by:** M06 (apply to cart), M07 (log usage on order)
**Source:** `src/modules/discounts/`

---

## Context
Coupons provide discount codes for customer retention. Applied at cart level, usage logged at order placement.

## V1 Scope
- Types: `FIXED_AMOUNT` | `PERCENTAGE`
- Fields: `code (unique/tenant), type, value, min_order_value, max_discount_amount`
- Usage limits: `total_usage_limit, per_customer_usage_limit`
- Validity: `starts_at, expires_at`
- Scope: `ALL | SPECIFIC_PRODUCTS | SPECIFIC_CATEGORIES`
- Usage log: `coupon_usages (coupon_id, customer_id, order_id, used_at)`
- Stacking rule with loyalty enforced at cart level

## Out of Scope
- Automatic discounts (no code needed)
- BOGO / bundle rules
- Vendor-specific coupons

<!-- TODO: Expand API contracts, full DDL, edge cases before Phase 2 implementation -->

## Acceptance Criteria
- [ ] Create 10%-off coupon → apply to cart → total correct
- [ ] Use coupon N times → (N+1)th blocked by `per_customer_usage_limit`
- [ ] Expired coupon rejected
- [ ] Minimum order value enforced
- [ ] Usage logged to `coupon_usages` on order placement
