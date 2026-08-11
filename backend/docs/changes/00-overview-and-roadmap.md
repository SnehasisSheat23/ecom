# Architectural Refactoring Roadmap

This document serves as the master overview for the modular architecture refactoring of the backend. Each component is broken down into an independent, step-by-step documentation file so changes can be made and verified incrementally in exact order.

---

## Sequential Implementation Index

| Step | Specification Document | Focus Area | Primary Impact |
|:---:|:---|:---|:---|
| **01** | [`01-catalog-optimization.md`](file:///Users/snehasisshit/openShutter/backend/docs/changes/01-catalog-optimization.md) | Catalog Optimization & Indexing | **[DONE]** Drops premature sales channel tables, adds `options` JSONB, composite storefront index, GIN tag index, and enforces non-null `vendorId`. |
| **02** | [`02-order-system-simplification.md`](file:///Users/snehasisshit/openShutter/backend/docs/changes/02-order-system-simplification.md) | Order System Simplification | **[DONE]** Replaces 4-table sub-order model with 2-table vendor-scoped orders (`orders` + `order_items`) using `checkoutGroupId`. |
| **03** | [`03-identity-and-user-separation.md`](file:///Users/snehasisshit/openShutter/backend/docs/changes/03-identity-and-user-separation.md) | Identity & User Separation | Separates Platform Users (`users` for Admins/Vendors) from Storefront Buyers (`customers`). |
| **04** | [`04-better-auth-for-platform.md`](file:///Users/snehasisshit/openShutter/backend/docs/changes/04-better-auth-for-platform.md) | Better Auth for Platform | Integrates Better Auth for fixed Email & Password auth for Tenant Admins and Vendor Staff. |
| **05** | [`05-flexible-customer-auth-engine.md`](file:///Users/snehasisshit/openShutter/backend/docs/changes/05-flexible-customer-auth-engine.md) | Flexible Customer Auth Engine | Adds per-tenant configurable login methods (Phone+OTP, Email+Pass, Social, Magic Links) via `tenant_auth_config`. |
| **06** | [`06-standalone-deployment-graduation.md`](file:///Users/snehasisshit/openShutter/backend/docs/changes/06-standalone-deployment-graduation.md) | Standalone Deployment & Graduation | Introduces `DEPLOYMENT_MODE` (`saas` vs `standalone`) allowing tenants to export & self-host as single-tenant apps. |
| **07** | [`07-inventory-and-stock-fixes.md`](file:///Users/snehasisshit/openShutter/backend/docs/changes/07-inventory-and-stock-fixes.md) | Inventory & Stock Alignment | **[DONE]** Enforces mandatory `vendorId` on inventory, bypasses untracked items (`trackInventory = false`) cleanly, and updates role guards. |

---

## Execution Philosophy

1. **Sequential Implementation**: Follow steps 01 through 07 in exact order.
2. **Independent Milestones**: Each document is self-contained and can be reviewed, approved, and implemented independently.
3. **Zero Breaking Spillover**: Schema changes in one module do not force premature rewrites of unrelated modules.
4. **Incremental Verification**: Every phase includes explicit verification steps (unit/integration tests and API checks) before moving to the next.
