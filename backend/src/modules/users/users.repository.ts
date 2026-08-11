import { eq, and, or, isNull } from 'drizzle-orm'
import { users, userRoles } from './users.schema.js'
import type { Database } from '../../lib/db.js'
import type { User, UserRoleRecord } from './users.types.js'
import type { UserRole } from '../../types/enums.js'

export class UsersRepository {
  constructor(private db: Database) {}

  async findById(userId: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, userId)).limit(1)
    return (rows[0] as User) || null
  }

  async findByEmail(email: string, tenantId?: string | null): Promise<User | null> {
    const condition = tenantId
      ? and(eq(users.email, email.toLowerCase()), or(eq(users.tenantId, tenantId), isNull(users.tenantId)))
      : eq(users.email, email.toLowerCase())

    const rows = await this.db.select().from(users).where(condition).limit(1)
    return (rows[0] as User) || null
  }

  async getUserRoles(userId: string): Promise<UserRoleRecord[]> {
    const rows = await this.db.select().from(userRoles).where(eq(userRoles.userId, userId))
    return rows as UserRoleRecord[]
  }

  async create(data: {
    tenantId?: string | null
    email: string
    passwordHash: string
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
  }): Promise<User> {
    const rows = await this.db
      .insert(users)
      .values({
        tenantId: data.tenantId ?? null,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        phone: data.phone ?? null,
      })
      .returning()

    return rows[0] as User
  }

  async addRole(userId: string, role: UserRole, tenantId?: string | null, permissions?: string[] | null): Promise<UserRoleRecord> {
    const rows = await this.db
      .insert(userRoles)
      .values({
        userId,
        role,
        tenantId: tenantId ?? null,
        permissions: permissions ?? null,
      })
      .returning()

    return rows[0] as UserRoleRecord
  }
}
