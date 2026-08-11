import type { Database } from '../../lib/db.js'
import { UsersRepository } from './users.repository.js'
import type { AuthenticatedUser, User } from './users.types.js'
import { AppError } from '../../lib/errors.js'
import { verifyPassword } from '../../lib/crypto.js'
import { createAccessToken, createRefreshToken } from '../../lib/auth.js'

export class UsersService {
  private repo: UsersRepository

  constructor(db: Database) {
    this.repo = new UsersRepository(db)
  }

  async getAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.repo.findById(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'user-not-found')
    }

    const roles = await this.repo.getUserRoles(userId)
    const isPlatformAdmin = roles.some((r) => r.role === 'PLATFORM_ADMIN')
    const isTenantAdmin = roles.some((r) => r.role === 'TENANT_ADMIN') || isPlatformAdmin

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      isPlatformAdmin,
      isTenantAdmin,
    }
  }

  async findByEmail(email: string, tenantId?: string | null): Promise<User | null> {
    return this.repo.findByEmail(email, tenantId)
  }

  async login(
    email: string,
    password?: string,
    tenantId?: string | null,
  ): Promise<{ user: AuthenticatedUser; accessToken: string; refreshToken: string }> {
    const user = await this.repo.findByEmail(email, tenantId)
    if (!user || !password) {
      throw new AppError('Invalid credentials', 401, 'invalid-credentials')
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash)
    if (!passwordMatches) {
      throw new AppError('Invalid credentials', 401, 'invalid-credentials')
    }

    const authUser = await this.getAuthenticatedUser(user.id)
    const accessToken = await createAccessToken({
      customerId: user.id,
      tenantId: user.tenantId || tenantId || '',
      email: user.email,
    })
    const refreshToken = createRefreshToken()

    return {
      user: authUser,
      accessToken,
      refreshToken,
    }
  }
}
