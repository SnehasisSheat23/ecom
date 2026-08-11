import type { UserRole } from '../../types/enums.js'

export interface User {
  id: string
  tenantId: string | null
  email: string
  passwordHash: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UserRoleRecord {
  id: string
  tenantId: string | null
  userId: string
  role: UserRole
  permissions: string[] | null
  createdAt: Date
}

export interface AuthenticatedUser {
  id: string
  tenantId: string | null
  email: string
  firstName: string | null
  lastName: string | null
  roles: UserRoleRecord[]
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
}
