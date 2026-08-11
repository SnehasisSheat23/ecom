import { getOptionalEnv } from './env.js'

export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false
  const normalizedEmail = email.trim().toLowerCase()
  const superAdminEmail = getOptionalEnv('SUPER_ADMIN_EMAIL')?.toLowerCase()
  return Boolean(superAdminEmail && normalizedEmail === superAdminEmail)
}
