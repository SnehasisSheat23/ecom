import { AppError } from '../../lib/errors.js'
import type { CreateProductInput, ProductListFilters, UpdateProductInput } from '../../modules/catalog/catalog.types.js'

export interface BaseActor {
  tenantId: string
  userId?: string
  role?: 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'TENANT_STAFF' | 'VENDOR_MEMBER' | 'CUSTOMER'
  isSuperAdmin?: boolean
  isAdmin?: boolean
  permissions?: string[] | null
}

export interface CatalogActor extends BaseActor {
  customerId: string
  activePartnerId: string | null
  partnerMemberships: Array<{
    partnerId: string
    role: 'owner' | 'manager' | 'staff'
    status: 'onboarding' | 'active' | 'suspended'
  }>
  email: string | null
}

export class AuthorizationService {
  /**
   * Asserts that an actor belongs to the requested tenant context.
   * SuperAdmins / PlatformAdmins bypass tenant checks.
   */
  assertSameTenant(actor: BaseActor | undefined | null, targetTenantId: string): void {
    if (!actor) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    if (actor.isSuperAdmin || actor.role === 'PLATFORM_ADMIN') {
      return
    }

    if (actor.tenantId !== targetTenantId) {
      throw new AppError('Forbidden: Cross-tenant access denied', 403, 'forbidden')
    }
  }

  /**
   * Asserts that an actor is a tenant admin (or platform superadmin) within the target tenant context.
   */
  assertTenantAdmin(actor: BaseActor | undefined | null, targetTenantId: string): void {
    this.assertSameTenant(actor, targetTenantId)

    const isPlatformOrTenantAdmin =
      actor?.isSuperAdmin ||
      actor?.isAdmin ||
      actor?.role === 'PLATFORM_ADMIN' ||
      actor?.role === 'TENANT_ADMIN'

    if (!isPlatformOrTenantAdmin) {
      throw new AppError('Tenant admin privileges required', 403, 'forbidden')
    }
  }

  /**
   * Asserts that an actor has a specific granular permission in-memory.
   */
  assertPermission(actor: BaseActor | undefined | null, permission: string): void {
    if (!actor) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    if (actor.isSuperAdmin || actor.role === 'PLATFORM_ADMIN') {
      return
    }

    // Admins without explicit permission overrides get full access
    if ((actor.isAdmin || actor.role === 'TENANT_ADMIN') && !actor.permissions) {
      return
    }

    if (!actor.permissions?.includes(permission)) {
      throw new AppError(`Missing required permission: ${permission}`, 403, 'forbidden')
    }
  }

  /**
   * Asserts that a specific domain module (e.g. 'marketplace', 'fulfillment') is enabled for the tenant.
   * SuperAdmins bypass module enablement checks.
   */
  assertModuleEnabled(
    moduleName: string,
    enabledModules?: string[] | null,
    actor?: BaseActor | null,
  ): void {
    if (actor?.isSuperAdmin) {
      return
    }

    if (!enabledModules || !enabledModules.includes(moduleName)) {
      throw new AppError(`Forbidden: ${moduleName} module is not enabled for this tenant`, 403, 'module-disabled')
    }
  }

  /**
   * Asserts that an actor has permission to access a specified vendor context.
   * Admins and SuperAdmins bypass vendor scope checks.
   */
  assertPartnerAccess(partnerId: string, actor?: CatalogActor | null): void {
    if (!actor) {
      throw new AppError('Access to specified vendor forbidden', 403, 'forbidden')
    }

    if (actor.isAdmin || actor.isSuperAdmin) {
      return
    }

    if (actor.activePartnerId !== partnerId) {
      throw new AppError('Access to specified vendor forbidden', 403, 'forbidden')
    }
  }

  /**
   * Asserts that an actor has an active vendor context selected and returns the vendor ID.
   */
  requireActivePartnerId(actor?: CatalogActor | null): string {
    if (!actor || !actor.activePartnerId) {
      throw new AppError('Active vendor context required', 403, 'forbidden')
    }
    return actor.activePartnerId
  }


  /**
   * Asserts that an actor can manage a specific product.
   */
  assertCanManageProduct(
    product: { tenantId: string; partnerId: string | null },
    actor?: CatalogActor,
  ): void {
    if (!actor) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    this.assertSameTenant(actor, product.tenantId)

    if (actor.isSuperAdmin) {
      return
    }

    if (actor.isAdmin && actor.tenantId === product.tenantId) {
      return
    }

    if (actor.activePartnerId && product.partnerId === actor.activePartnerId) {
      return
    }

    throw new AppError('Forbidden: Insufficient permissions to manage product', 403, 'forbidden')
  }

  /**
   * Asserts that an actor can manage categories.
   */
  assertCanManageCategories(tenantId: string, actor?: CatalogActor): void {
    if (!actor) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    if (actor.isSuperAdmin) {
      return
    }

    if (actor.isAdmin && actor.tenantId === tenantId) {
      return
    }

    throw new AppError('Forbidden: Only store admins can manage categories', 403, 'forbidden')
  }

  /**
   * Asserts that an actor can manage collections.
   */
  assertCanManageCollections(tenantId: string, actor?: CatalogActor): void {
    if (!actor) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    if (actor.isSuperAdmin) {
      return
    }

    if (actor.isAdmin && actor.tenantId === tenantId) {
      return
    }

    throw new AppError('Forbidden: Only store admins can manage collections', 403, 'forbidden')
  }

  /**
   * Asserts that an actor can manage a specific product type (Tenant-Global or Vendor-Custom).
   */
  assertCanManageProductType(
    productType: { tenantId: string; partnerId: string | null },
    actor?: CatalogActor,
  ): void {
    if (!actor) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    this.assertSameTenant(actor, productType.tenantId)

    if (actor.isSuperAdmin) {
      return
    }

    if (actor.isAdmin && actor.tenantId === productType.tenantId) {
      return
    }

    if (productType.partnerId && actor.activePartnerId === productType.partnerId) {
      return
    }

    throw new AppError('Forbidden: Insufficient permissions to manage this product type', 403, 'forbidden')
  }

  /**
   * Scopes product creation payload for the actor.
   */
  scopeProductInputForActor(
    input: CreateProductInput,
    actor?: CatalogActor,
  ): CreateProductInput {
    if (!actor || actor.isAdmin || actor.isSuperAdmin) {
      return input
    }

    if (!actor.activePartnerId) {
      throw new AppError('Forbidden: Vendor access requires active vendor ID', 403, 'forbidden')
    }

    if (input.partnerId && input.partnerId !== actor.activePartnerId) {
      throw new AppError('Forbidden: Cannot create product for another vendor', 403, 'forbidden')
    }

    return { ...input, partnerId: actor.activePartnerId }
  }

  /**
   * Scopes product update payload for the actor.
   */
  scopeProductUpdateForActor(
    input: UpdateProductInput,
    currentVendorId: string | null,
    actor?: CatalogActor,
  ): UpdateProductInput {
    if (!actor || actor.isAdmin || actor.isSuperAdmin) {
      return input
    }

    if (!actor.activePartnerId || currentVendorId !== actor.activePartnerId) {
      throw new AppError('Forbidden: Cannot update product belonging to another vendor', 403, 'forbidden')
    }

    if (input.partnerId !== undefined && input.partnerId !== actor.activePartnerId) {
      throw new AppError('Forbidden: Cannot reassign product to another vendor', 403, 'forbidden')
    }

    return { ...input, partnerId: actor.activePartnerId }
  }

  /**
   * Scopes listing filters for the actor.
   */
  scopeProductListFiltersForActor(
    filters: ProductListFilters,
    actor?: CatalogActor,
  ): ProductListFilters {
    if (!actor || actor.isAdmin || actor.isSuperAdmin) {
      return filters
    }

    if (!actor.activePartnerId) {
      throw new AppError('Forbidden: Vendor filter requires active vendor ID', 403, 'forbidden')
    }

    return {
      ...filters,
      partnerId: actor.activePartnerId,
    }
  }
}
