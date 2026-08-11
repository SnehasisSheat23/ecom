import { AppError } from '../../../lib/errors.js'
import { AuthorizationService, type CatalogActor } from '../../../layers/authorization/authorization.service.js'
import { slugify } from '../../../lib/slug.js'
import type { ProductTypeRepository } from './product-type.repository.js'
import type {
  CatalogProductType,
  CreateProductTypeInput,
  ProductTypeQueryFilters,
  UpdateProductTypeInput,
} from './product-type.types.js'

export class ProductTypeService {
  constructor(
    private readonly repository: ProductTypeRepository,
    private readonly auth: AuthorizationService = new AuthorizationService(),
  ) {}

  async createProductType(
    input: CreateProductTypeInput,
    tenantId: string,
    actor?: CatalogActor,
  ): Promise<CatalogProductType> {
    this.auth.assertSameTenant(actor, tenantId)

    const targetVendorId = actor && !actor.isAdmin && !actor.isSuperAdmin ? actor.activePartnerId : (input.partnerId ?? null)

    this.auth.assertCanManageProductType({ tenantId, partnerId: targetVendorId }, actor)

    const slug = input.slug ? slugify(input.slug) : slugify(input.name)

    const existing = await this.repository.findBySlug(tenantId, slug)
    if (existing) {
      throw new AppError(`Product type slug already exists: ${slug}`, 409, 'product-type-slug-conflict')
    }

    return this.repository.createProductType(tenantId, {
      ...input,
      partnerId: targetVendorId,
      slug,
    })
  }

  async updateProductType(
    id: string,
    input: UpdateProductTypeInput,
    tenantId: string,
    actor?: CatalogActor,
  ): Promise<CatalogProductType> {
    this.auth.assertSameTenant(actor, tenantId)

    const existing = await this.repository.findById(tenantId, id)
    if (!existing) {
      throw new AppError(`Product type not found: ${id}`, 404, 'product-type-not-found')
    }

    this.auth.assertCanManageProductType(existing, actor)

    if (input.slug) {
      const formattedSlug = slugify(input.slug)
      if (formattedSlug !== existing.slug) {
        const slugCheck = await this.repository.findBySlug(tenantId, formattedSlug)
        if (slugCheck && slugCheck.id !== id) {
          throw new AppError(`Product type slug already exists: ${formattedSlug}`, 409, 'product-type-slug-conflict')
        }
        input.slug = formattedSlug
      }
    }

    const updated = await this.repository.updateProductType(tenantId, id, input)
    if (!updated) {
      throw new AppError(`Product type update failed: ${id}`, 500, 'update-failed')
    }

    return updated
  }

  async deleteProductType(id: string, tenantId: string, actor?: CatalogActor): Promise<void> {
    this.auth.assertSameTenant(actor, tenantId)

    const existing = await this.repository.findById(tenantId, id)
    if (!existing) {
      throw new AppError(`Product type not found: ${id}`, 404, 'product-type-not-found')
    }

    this.auth.assertCanManageProductType(existing, actor)

    await this.repository.deleteProductType(tenantId, id)
  }

  async getProductTypeById(id: string, tenantId: string): Promise<CatalogProductType> {
    const productType = await this.repository.findById(tenantId, id)
    if (!productType) {
      throw new AppError(`Product type not found: ${id}`, 404, 'product-type-not-found')
    }
    return productType
  }

  async getProductTypeBySlug(slug: string, tenantId: string): Promise<CatalogProductType> {
    const productType = await this.repository.findBySlug(tenantId, slug)
    if (!productType) {
      throw new AppError(`Product type not found: ${slug}`, 404, 'product-type-not-found')
    }
    return productType
  }

  async listProductTypes(
    tenantId: string,
    filters: ProductTypeQueryFilters = {},
    actor?: CatalogActor,
  ): Promise<{ items: CatalogProductType[]; total: number; page: number; perPage: number }> {
    if (actor) {
      this.auth.assertSameTenant(actor, tenantId)
    }

    const scopedVendorId = actor && !actor.isAdmin && !actor.isSuperAdmin ? actor.activePartnerId : filters.partnerId

    return this.repository.listProductTypes(tenantId, {
      ...filters,
      partnerId: scopedVendorId,
    })
  }
}
