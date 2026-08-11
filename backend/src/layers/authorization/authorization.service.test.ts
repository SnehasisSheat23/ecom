import { describe, expect, it } from 'vitest'
import { AuthorizationService } from './authorization.service.js'
import type { CatalogActor } from './authorization.service.js'

const tenant1Actor: CatalogActor = {
  customerId: 'cust-1',
  tenantId: 'tenant-1',
  partnerMemberships: [{ partnerId: 'vendor-1', role: 'staff', status: 'active' }],
  activePartnerId: 'vendor-1',
  email: 'vendor1@example.com',
  isAdmin: false,
  isSuperAdmin: false,
}

const adminActor: CatalogActor = {
  customerId: 'admin-1',
  tenantId: 'tenant-1',
  partnerMemberships: [],
  activePartnerId: null,
  email: 'admin@example.com',
  isAdmin: true,
  isSuperAdmin: false,
}

const superAdminActor: CatalogActor = {
  customerId: 'super-1',
  tenantId: 'tenant-global',
  partnerMemberships: [],
  activePartnerId: null,
  email: 'super@example.com',
  isAdmin: true,
  isSuperAdmin: true,
}

describe('AuthorizationService', () => {
  const auth = new AuthorizationService()

  describe('assertSameTenant', () => {
    it('allows access when actor tenantId matches targetTenantId', () => {
      expect(() => auth.assertSameTenant(tenant1Actor, 'tenant-1')).not.toThrow()
    })

    it('blocks access when actor tenantId does not match targetTenantId', () => {
      expect(() => auth.assertSameTenant(tenant1Actor, 'tenant-2')).toThrowError('Cross-tenant access denied')
    })

    it('allows super admin cross-tenant access', () => {
      expect(() => auth.assertSameTenant(superAdminActor, 'tenant-1')).not.toThrow()
    })

    it('rejects unauthenticated undefined actors', () => {
      expect(() => auth.assertSameTenant(undefined, 'tenant-1')).toThrowError('Forbidden')
    })
  })

  describe('assertTenantAdmin', () => {
    it('allows tenant admin within their tenant', () => {
      expect(() => auth.assertTenantAdmin(adminActor, 'tenant-1')).not.toThrow()
    })

    it('allows super admin across tenants', () => {
      expect(() => auth.assertTenantAdmin(superAdminActor, 'tenant-2')).not.toThrow()
    })

    it('blocks non-admin vendor staff', () => {
      expect(() => auth.assertTenantAdmin(tenant1Actor, 'tenant-1')).toThrowError('Tenant admin privileges required')
    })

    it('blocks tenant admin cross-tenant action', () => {
      expect(() => auth.assertTenantAdmin(adminActor, 'tenant-2')).toThrowError('Cross-tenant access denied')
    })
  })

  describe('assertModuleEnabled', () => {
    it('allows access when module is enabled', () => {
      expect(() => auth.assertModuleEnabled('marketplace', ['catalog', 'marketplace'], adminActor)).not.toThrow()
    })

    it('blocks access when module is not enabled', () => {
      expect(() => auth.assertModuleEnabled('fulfillment', ['catalog'], adminActor)).toThrowError('fulfillment module is not enabled')
    })

    it('allows super admin to bypass module enablement checks', () => {
      expect(() => auth.assertModuleEnabled('fulfillment', ['catalog'], superAdminActor)).not.toThrow()
    })
  })

  describe('assertPartnerAccess', () => {
    it('allows vendor staff to access their active vendor', () => {
      expect(() => auth.assertPartnerAccess('vendor-1', tenant1Actor)).not.toThrow()
    })

    it('blocks vendor staff from accessing another vendor', () => {
      expect(() => auth.assertPartnerAccess('vendor-2', tenant1Actor)).toThrowError('Access to specified vendor forbidden')
    })

    it('allows admin to access any vendor', () => {
      expect(() => auth.assertPartnerAccess('vendor-2', adminActor)).not.toThrow()
    })

    it('rejects unauthenticated null/undefined actor', () => {
      expect(() => auth.assertPartnerAccess('vendor-1', null)).toThrowError('Access to specified vendor forbidden')
    })
  })

  describe('requireActivePartnerId', () => {
    it('returns active vendor ID when present', () => {
      expect(auth.requireActivePartnerId(tenant1Actor)).toBe('vendor-1')
    })

    it('throws when active vendor ID is missing', () => {
      expect(() => auth.requireActivePartnerId(adminActor)).toThrowError('Active vendor context required')
    })
  })

  describe('assertCanManageProduct', () => {
    const product = { tenantId: 'tenant-1', partnerId: 'vendor-1' }
    const otherProduct = { tenantId: 'tenant-1', partnerId: 'vendor-2' }

    it('allows vendor staff to manage their vendor product', () => {
      expect(() => auth.assertCanManageProduct(product, tenant1Actor)).not.toThrow()
    })

    it('blocks vendor staff from managing another vendor product', () => {
      expect(() => auth.assertCanManageProduct(otherProduct, tenant1Actor)).toThrowError('Insufficient permissions')
    })

    it('allows tenant admin to manage any vendor product in their tenant', () => {
      expect(() => auth.assertCanManageProduct(otherProduct, adminActor)).not.toThrow()
    })

    it('blocks tenant admin from managing product in a different tenant', () => {
      const foreignProduct = { tenantId: 'tenant-2', partnerId: 'vendor-1' }
      expect(() => auth.assertCanManageProduct(foreignProduct, adminActor)).toThrowError('Cross-tenant access denied')
    })
  })

  describe('assertCanManageCategories & assertCanManageCollections', () => {
    it('allows tenant admin to manage categories', () => {
      expect(() => auth.assertCanManageCategories('tenant-1', adminActor)).not.toThrow()
    })

    it('blocks non-admin vendor staff from managing categories', () => {
      expect(() => auth.assertCanManageCategories('tenant-1', tenant1Actor)).toThrowError('Only store admins can manage categories')
    })

    it('allows tenant admin to manage collections', () => {
      expect(() => auth.assertCanManageCollections('tenant-1', adminActor)).not.toThrow()
    })

    it('blocks non-admin vendor staff from managing collections', () => {
      expect(() => auth.assertCanManageCollections('tenant-1', tenant1Actor)).toThrowError('Only store admins can manage collections')
    })
  })

  describe('scoping helpers', () => {
    it('auto-assigns partnerId when omitted by vendor staff', () => {
      const scoped = auth.scopeProductInputForActor(
        { title: 'Item', variants: [] },
        tenant1Actor
      )
      expect(scoped.partnerId).toBe('vendor-1')
    })

    it('blocks vendor staff when attempting to create product for another vendor', () => {
      expect(() =>
        auth.scopeProductInputForActor(
          { title: 'Item', variants: [], partnerId: 'vendor-2' },
          tenant1Actor
        )
      ).toThrowError('Cannot create product for another vendor')
    })

    it('scopes list filters for vendor staff', () => {
      const scoped = auth.scopeProductListFiltersForActor({}, tenant1Actor)
      expect(scoped.partnerId).toBe('vendor-1')
    })
  })

  describe('assertPermission & Roles', () => {
    it('allows PLATFORM_ADMIN to bypass permission checks', () => {
      const platformAdmin = { tenantId: 'tenant-1', role: 'PLATFORM_ADMIN' as const }
      expect(() => auth.assertPermission(platformAdmin, 'catalog:write')).not.toThrow()
    })

    it('allows TENANT_ADMIN without explicit permissions array to access any permission', () => {
      const tenantAdmin = { tenantId: 'tenant-1', role: 'TENANT_ADMIN' as const }
      expect(() => auth.assertPermission(tenantAdmin, 'orders:read')).not.toThrow()
    })

    it('validates granular in-memory permissions array for staff', () => {
      const staffMember = { tenantId: 'tenant-1', role: 'TENANT_STAFF' as const, permissions: ['orders:read'] }
      expect(() => auth.assertPermission(staffMember, 'orders:read')).not.toThrow()
      expect(() => auth.assertPermission(staffMember, 'catalog:write')).toThrowError('Missing required permission: catalog:write')
    })
  })
})

