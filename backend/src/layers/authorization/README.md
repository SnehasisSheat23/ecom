# Centralized Authorization Layer Reference (AI-Agent & Developer Guide)

This document provides an exhaustive reference specification of the centralized, policy-based **Authorization Layer** (`AuthorizationService`) located at `src/layers/authorization/`. It decouples security policies, tenant boundary checks, and vendor role assertions from domain business logic.

---

## AI Agent & Developer Directives

> [!IMPORTANT]
> **DOC MAINTENANCE MANDATE**: Whenever `AuthorizationService` methods, actor interfaces, or security assertion policies are added, updated, or modified, **you MUST update this README file** to keep symbol maps, parameter descriptions, line numbers, and error codes accurate.

---

## 1. Directory Structure & File Map

| File Path | Description | Key Symbols & Exports |
| :--- | :--- | :--- |
| [`authorization.service.ts`](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts) | Core Authorization Policy Engine | `AuthorizationService`, `BaseActor`, `CatalogActor` |
| [`authorization.service.test.ts`](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.test.ts) | Vitest Authorization Policy Test Suite | `describe('AuthorizationService')` (15 unit tests) |

---

## 2. Core Actor Models & Interfaces

### `BaseActor` ([authorization.service.ts:L4-L9](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L4-L9))
Base actor representation shared across all module contexts.
```typescript
export interface BaseActor {
  tenantId: string          // UUID of the tenant the actor belongs to
  isSuperAdmin?: boolean    // Platform-wide superadmin override flag
  isAdmin?: boolean         // Tenant-level admin flag
  permissions?: string[]   // Granular permission strings (for future ABAC expansion)
}
```

### `CatalogActor` ([authorization.service.ts:L11-L20](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L11-L20))
Extended actor model for catalog and vendor operations.
```typescript
export interface CatalogActor extends BaseActor {
  customerId: string        // User/Customer Account ID
  activePartnerId: string | null // Currently selected vendor scope (null for admins)
  partnerMemberships: Array<{
    partnerId: string
    role: 'owner' | 'manager' | 'staff'
    status: 'onboarding' | 'active' | 'suspended'
  }>
  email: string
}
```

---

## 3. Authorization Methods & Behavior Specification

### A. `assertSameTenant(actor, targetTenantId)` ([L27-L39](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L27-L39))
- **Parameters**: `actor: BaseActor | undefined | null`, `targetTenantId: string`
- **Return**: `void`
- **Behavior**:
  1. Throws `403 Forbidden` if `actor` is undefined or null.
  2. Returns immediately if `actor.isSuperAdmin === true`.
  3. Throws `403 Forbidden: Cross-tenant access denied` if `actor.tenantId !== targetTenantId`.
- **Error Code**: `forbidden` (HTTP 403).

### B. `assertTenantAdmin(actor, targetTenantId)` ([L44-L51](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L44-L51))
- **Parameters**: `actor: BaseActor | undefined | null`, `targetTenantId: string`
- **Return**: `void`
- **Behavior**:
  1. Executes `assertSameTenant(actor, targetTenantId)`.
  2. Returns immediately if `actor.isAdmin === true` or `actor.isSuperAdmin === true`.
  3. Throws `403 Forbidden: Tenant admin privileges required` otherwise.
- **Error Code**: `forbidden` (HTTP 403).

### C. `assertModuleEnabled(moduleName, enabledModules, actor)` ([L56-L68](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L56-L68))
- **Parameters**: `moduleName: string`, `enabledModules?: string[] | null`, `actor?: BaseActor | null`
- **Return**: `void`
- **Behavior**:
  1. Returns immediately if `actor.isSuperAdmin === true`.
  2. Throws `403 Forbidden: moduleName module is not enabled for this tenant` if `enabledModules` does not contain `moduleName`.
- **Error Code**: `module-disabled` (HTTP 403).

### C. `assertPartnerAccess(partnerId, actor)` ([L57-L68](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L57-L68))
- **Parameters**: `partnerId: string`, `actor?: CatalogActor | null`
- **Return**: `void`
- **Behavior**:
  1. Throws `403 Forbidden: Access to specified vendor forbidden` if `actor` is null/undefined.
  2. Returns immediately if `actor.isAdmin === true` or `actor.isSuperAdmin === true`.
  3. Returns immediately if `actor.activePartnerId === partnerId`.
  4. Throws `403 Forbidden: Access to specified vendor forbidden` otherwise.
- **Error Code**: `forbidden` (HTTP 403).

### D. `requireActivePartnerId(actor)` ([L73-L79](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L73-L79))
- **Parameters**: `actor?: CatalogActor | null`
- **Return**: `string` (the active vendor ID)
- **Behavior**:
  1. Throws `403 Forbidden: Active vendor context required` if `actor` is null/undefined or `actor.activePartnerId` is missing.
  2. Returns `actor.activePartnerId`.
- **Error Code**: `forbidden` (HTTP 403).

### E. `assertCanManageProduct(product, actor)` ([L84-L107](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L84-L107))
- **Parameters**: `product: { tenantId: string; partnerId: string | null }`, `actor?: CatalogActor`
- **Return**: `void`
- **Behavior**:
  1. Executes `assertSameTenant(actor, product.tenantId)`.
  2. Returns immediately if `actor.isSuperAdmin === true`.
  3. Returns immediately if `actor.isAdmin === true` and `actor.tenantId === product.tenantId`.
  4. Returns immediately if `actor.activePartnerId === product.partnerId`.
  5. Throws `403 Forbidden: Insufficient permissions to manage product` otherwise.
- **Error Code**: `forbidden` (HTTP 403).

### C. `assertCanManageCategories(tenantId, actor)` ([L70-L83](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L70-L83))
- **Parameters**: `tenantId: string`, `actor?: CatalogActor`
- **Return**: `void`
- **Behavior**:
  1. Returns if `actor.isSuperAdmin === true`.
  2. Returns if `actor.isAdmin === true` and `actor.tenantId === tenantId`.
  3. Throws `403 Forbidden: Only store admins can manage categories` for non-admin vendor staff.
- **Error Code**: `forbidden` (HTTP 403).

### D. `assertCanManageCollections(tenantId, actor)` ([L88-L101](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L88-L101))
- **Parameters**: `tenantId: string`, `actor?: CatalogActor`
- **Return**: `void`
- **Behavior**:
  1. Returns if `actor.isSuperAdmin === true`.
  2. Returns if `actor.isAdmin === true` and `actor.tenantId === tenantId`.
  3. Throws `403 Forbidden: Only store admins can manage collections` for non-admin vendor staff.
- **Error Code**: `forbidden` (HTTP 403).

### E. `scopeProductInputForActor(input, actor)` ([L106-L127](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L106-L127))
- **Parameters**: `input: CreateProductInput`, `actor?: CatalogActor`
- **Return**: `CreateProductInput`
- **Behavior**:
  1. Returns `input` unchanged for Admins or SuperAdmins.
  2. Throws `403 Forbidden` if vendor staff lacks `activePartnerId`.
  3. Throws `403 Forbidden: Cannot create product for another vendor` if `input.partnerId` does not match `actor.activePartnerId`.
  4. Auto-assigns `partnerId = actor.activePartnerId` if omitted.

### F. `scopeProductUpdateForActor(input, currentVendorId, actor)` ([L132-L153](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L132-L153))
- **Parameters**: `input: UpdateProductInput`, `currentVendorId: string | null`, `actor?: CatalogActor`
- **Return**: `UpdateProductInput`
- **Behavior**:
  1. Throws `403 Forbidden` if vendor staff tries to update a product owned by another vendor (`currentVendorId !== actor.activePartnerId`).
  2. Throws `403 Forbidden` if vendor staff attempts to reassign `partnerId` to a different vendor.

### G. `scopeProductListFiltersForActor(filters, actor)` ([L158-L172](file:///Users/snehasisshit/openShutter/Backend/src/layers/authorization/authorization.service.ts#L158-L172))
- **Parameters**: `filters: ProductListFilters`, `actor?: CatalogActor`
- **Return**: `ProductListFilters`
- **Behavior**: Automatically forces `filters.partnerId = actor.activePartnerId` for vendor staff queries.

---

## 4. Integration Guide for Other Modules

To enforce authorization in new modules (`Orders`, `Inventory`, `Vendors`, `Billing`):

```typescript
import { AuthorizationService } from '../../layers/authorization/authorization.service.js'

export class OrderService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly auth: AuthorizationService = new AuthorizationService(),
  ) {}

  async getOrder(orderId: string, tenantId: string, actor?: BaseActor) {
    this.auth.assertSameTenant(actor, tenantId)
    // Domain logic...
  }
}
```
