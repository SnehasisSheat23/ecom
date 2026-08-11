# TASKS-M05 — Shipping

## Prerequisites
- [ ] M01 complete (tenant config for rates)

## Tasks
### T01 — Schema: `shipping_zones` table
### T02 — Service: `calculate()` with flat rate + free threshold logic
### T03 — Wire into `src/lib/pricing.ts`
### T04 — Route: GET /shipping/estimate
### T05 — Tests: rate calculation, free shipping threshold, no address fallback

## Integration Test
1. Set tenant shipping_flat_rate = 4900 (₹49), free_shipping_threshold = 50000 (₹500)
2. Cart with ₹300 → shipping = ₹49
3. Cart with ₹600 → shipping = ₹0
