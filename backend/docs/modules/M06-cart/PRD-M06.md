# PRD-M06 — Cart

**Layer:** Core | **Phase:** 1 | **Estimate:** 2 days
**Depends on:** M02 (auth/guests), M03 (variants/prices + tracking mode), M04 (inventory reservation for tracked variants), M05 (shipping in totals)
**Required by:** M07 (order placement from cart), M11 (abandonment watches carts)
**Source:** `src/modules/cart/`

---

## Context
The cart is where customers collect items before checkout. It supports both guest and authenticated users, with cart merging on login. PostgreSQL is the source of truth; Upstash Redis provides fast reads in the default serverless deployment. The pricing pipeline runs through the cart to show live totals.

## V1 Scope
- Guest and authenticated carts
- Add item (variant_id + quantity + optional metadata), update quantity, remove item
- Item stores: `variant_id, quantity, unit_price (snapshot at add time), metadata (JSONB), line_total`
- Cart stores optional `metadata (JSONB)` for order-level custom fields (e.g. delivery_slot)
- Price re-validation on checkout initiation (show notice if price changed since add)
- Cart merge on login (guest → customer)
- Apply coupon code (stub returning 0 until M09)
- Apply loyalty points (stub returning 0 until M12)
- Stacking rule: coupon OR loyalty points, not both (from tenant config `coupon_loyalty_stacking`)
- 7-day expiry via QStash Webhook (releases inventory on expiry)
- Total breakdown: `subtotal, discount_amount, shipping_amount, tax_amount(0), total`
- Redis cache with Postgres source of truth
- `saved_for_later_items` table (schema hook — no endpoints in v1)

## Out of Scope
- Saved for later / wishlist UI
- Cart sharing
- Multi-currency carts

## API Contracts
```
GET    /cart                          — Get current cart with totals
POST   /cart/items                    — Add item
PATCH  /cart/items/:itemId            — Update quantity
DELETE /cart/items/:itemId            — Remove item
POST   /cart/coupon                   — Apply coupon code (stub)
DELETE /cart/coupon                   — Remove coupon
POST   /cart/loyalty                  — Apply loyalty points (stub)
DELETE /cart/loyalty                  — Remove loyalty points
POST   /cart/checkout                 — Initiate checkout (validates prices, reserves inventory)
```

## Business Logic Rules
1. Adding an item reserves inventory via M04 only when the variant has `track_inventory = true`
2. Removing an item releases inventory via M04 only when the variant has `track_inventory = true`
3. Updating quantity: release old, reserve new (net adjustment) only for tracked variants
4. `unit_price` captured at add time — displayed alongside current price if different
5. On checkout initiation: re-validate all prices and stock. Return notice for any changed items.
6. **Cart expiry webhook:** After 7 days inactivity, QStash calls the cart expiry endpoint to release all inventory reservations and mark cart expired. Handler must be idempotent.
7. Upstash Redis cache written on every mutation, read on every GET. If cache misses, fall back to Postgres.
8. Guest cart identified by `guest_session_id`. Authenticated cart by `customer_id`.
9. On login merge: if customer has existing active cart, merge items (sum quantities for same variant)

## Edge Cases
| Edge Case | Expected Behavior |
|-----------|-------------------|
| Add same variant twice | Increment quantity, reserve additional |
| Add tracked variant with 0 stock | 400 — insufficient stock (unless backorder) |
| Add untracked variant | Success — no stock validation or reservation |
| Price changed since add | On checkout: return `price_changed` notice with old/new price |
| Cart expired while browsing | On next access, return `cart_expired` error, create fresh cart |
| Guest and customer have same variant in cart | On merge: customer cart quantity = sum of both |
| Apply coupon + loyalty (stacking disabled) | 400 — choose one |

## Acceptance Criteria
- [ ] Guest adds items, logs in, cart merges correctly
- [ ] Price re-validation notice fires when price changed since add
- [ ] Cart total matches: `subtotal - discount(0) + shipping + tax(0)`
- [ ] Cart expires after 7-day inactivity via QStash webhook, inventory reservations released
- [ ] Redis cache returns same data as Postgres
- [ ] Inventory reserved on add, released on remove
- [ ] Untracked variants can be added, updated, and removed without touching M04
- [ ] Cart expiry webhook handler is idempotent (safe under duplicate QStash delivery)
- [ ] QStash publish failures for cart expiry are logged with tenant and job identifiers
- [ ] Integration test covers cart inactivity → QStash callback → reservation release
