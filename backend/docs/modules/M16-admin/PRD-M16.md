# PRD-M16 — Admin (Payload CMS)

**Layer:** Core | **Phase:** 3 | **Estimate:** 3 days
**Depends on:** All modules (M01–M15)
**Source:** `src/modules/admin/`

---

## Context
Payload CMS-based admin dashboard for store owners and super admins. Wraps all other modules' admin functionality into a unified UI. This is the last module built because it needs stable APIs from all others.

## V1 Scope
- Payload CMS with custom collections mapped to existing tables
- Super admin: tenant management, all module access
- Store admin: products, orders, customers, coupons, notifications, reviews (per tenant)
- Vendor admin: own products, sub-orders (per vendor)
- Role-based access: super_admin, store_admin, vendor_admin
- Dashboard: key metrics (orders today, revenue, low stock alerts)

## Out of Scope
- Custom report builder
- Data export / analytics
- White-label admin (custom branding per tenant)

<!-- TODO: Expand before Phase 3 — define all collections, views, access control -->

## Acceptance Criteria
- [ ] Super admin can manage tenants and all data
- [ ] Store admin can only see own tenant's data
- [ ] Vendor admin can only see own products and sub-orders
- [ ] Dashboard shows accurate metrics
- [ ] All CRUD operations work through Payload UI
