# PRD-M13 — Reviews

**Layer:** Core | **Phase:** 2 | **Estimate:** 1.5 days
**Depends on:** M01, M03 (products), M07 (verified purchase)
**Source:** `src/modules/reviews/`

---

## Context
Customer reviews with purchase verification. Only customers who ordered the product can leave a review.

## V1 Scope
- `reviews` table: `product_id, customer_id, order_id, rating (1-5), title, body, status (pending|approved|rejected), verified_purchase BOOLEAN`
- Only one review per customer per product
- Verified purchase: check if customer has a DELIVERED order containing the product
- Admin moderation (approve/reject)
- Average rating computed from approved reviews
- Feature flag gated: `tenant.features.reviews`

## Out of Scope
- Review images/videos
- Review replies (store owner)
- Helpful votes
- Review analytics

<!-- TODO: Expand DDL before Phase 2 -->

## Acceptance Criteria
- [ ] Customer with delivered order can review the product
- [ ] Customer without order → 403
- [ ] One review per customer per product
- [ ] Average rating computed correctly
- [ ] Rejected reviews hidden from public listing
