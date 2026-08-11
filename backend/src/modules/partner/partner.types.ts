import type { PaginatedResult } from '../../lib/types.js'

export type PartnerStatus = 'onboarding' | 'active' | 'suspended'

export interface Partner {
  id: string
  tenantId: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  description: string | null
  logoUrl: string | null
  taxId: string | null
  address: Record<string, unknown> | null
  status: PartnerStatus
  metadata: Record<string, unknown>
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  pincodeCount?: number
}

export interface CreatePartnerInput {
  name: string
  slug?: string
  email?: string | null
  phone?: string | null
  description?: string | null
  logoUrl?: string | null
  taxId?: string | null
  address?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  status?: PartnerStatus
}

export interface UpdatePartnerInput extends Partial<CreatePartnerInput> {}

export interface PartnerListFilters {
  status?: PartnerStatus
  page?: number
  perPage?: number
}
