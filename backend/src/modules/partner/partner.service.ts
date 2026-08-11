import { AuthorizationService } from '../../layers/authorization/authorization.service.js'
import { AppError } from '../../lib/errors.js'
import { slugify } from '../../lib/slug.js'
import type { PaginatedResult } from '../../lib/types.js'
import type { AuthenticatedCustomer } from '../customers/customers.types.js'
import type { PartnerRepository } from './partner.repository.js'
import type { CreatePartnerInput, Partner, PartnerStatus, UpdatePartnerInput } from './partner.types.js'

export class PartnerService {
  private readonly auth: AuthorizationService

  constructor(
    private readonly repository: PartnerRepository,
    authService?: AuthorizationService,
  ) {
    this.auth = authService ?? new AuthorizationService()
  }

  private async requirePartner(tenantId: string, partnerId: string): Promise<Partner> {
    const partner = await this.repository.findPartnerById(tenantId, partnerId)
    if (!partner || partner.deletedAt) {
      throw new AppError('Partner not found', 404, 'partner-not-found')
    }
    return partner
  }

  async createPartner(tenantId: string, input: CreatePartnerInput, actor: AuthenticatedCustomer): Promise<Partner> {
    this.auth.assertTenantAdmin(actor, tenantId)
    const baseSlug = input.slug || slugify(input.name)
    let slug = baseSlug
    let suffix = 1

    while (await this.repository.findPartnerBySlug(tenantId, slug)) {
      slug = `${baseSlug}-${suffix++}`
    }

    return this.repository.createPartner(tenantId, { ...input, slug })
  }

  async listPartners(
    tenantId: string,
    actor: AuthenticatedCustomer,
    options: { status?: PartnerStatus; page: number; perPage: number }
  ): Promise<PaginatedResult<Partner>> {
    this.auth.assertTenantAdmin(actor, tenantId)
    return this.repository.listPartners(tenantId, options)
  }

  async getPartner(tenantId: string, partnerId: string, actor: AuthenticatedCustomer): Promise<Partner> {
    this.auth.assertTenantAdmin(actor, tenantId)
    return this.requirePartner(tenantId, partnerId)
  }

  async updatePartner(
    tenantId: string,
    partnerId: string,
    input: UpdatePartnerInput,
    actor: AuthenticatedCustomer
  ): Promise<Partner> {
    this.auth.assertTenantAdmin(actor, tenantId)
    await this.requirePartner(tenantId, partnerId)
    return this.repository.updatePartner(tenantId, partnerId, input)
  }

  async softDeletePartner(tenantId: string, partnerId: string, actor: AuthenticatedCustomer): Promise<void> {
    this.auth.assertTenantAdmin(actor, tenantId)
    await this.requirePartner(tenantId, partnerId)
    await this.repository.softDeletePartner(tenantId, partnerId)
  }
}
