# DESIGN-M09 — Discounts & Coupons

<!-- TODO: Expand with full DDL, service interface, sequence diagrams before Phase 2 -->

## File Map
| File | Purpose |
|------|---------|
| `discounts.schema.ts` | `coupons`, `coupon_usages` tables |
| `discounts.repository.ts` | Coupon CRUD, usage tracking |
| `discounts.service.ts` | Apply coupon logic, validate limits |
| `discounts.routes.ts` | Admin CRUD + cart apply/remove |

## Key Tables
- `coupons`: code, type, value, limits, validity, scope
- `coupon_usages`: coupon_id, customer_id, order_id, used_at

## Service Interface
<!-- TODO: Public methods with TypeScript signatures -->

## Database Schema
<!-- TODO: Full CREATE TABLE statements -->
