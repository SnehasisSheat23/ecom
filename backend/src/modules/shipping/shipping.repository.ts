import { and, asc, eq } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import { shippingMethods, shippingZones } from './shipping.schema.js'

export class ShippingRepository {
  constructor(private readonly db: Database) {}

  async findDefaultZone(tenantId: string) {
    const [row] = await this.db
      .select()
      .from(shippingZones)
      .where(and(eq(shippingZones.tenantId, tenantId), eq(shippingZones.isDefault, true)))
      .limit(1)

    return row ?? null
  }

  async listZones(tenantId: string) {
    return this.db
      .select()
      .from(shippingZones)
      .where(eq(shippingZones.tenantId, tenantId))
      .orderBy(asc(shippingZones.createdAt))
  }

  async createZone(tenantId: string, data: any) {
    const [row] = await this.db
      .insert(shippingZones)
      .values({ ...data, tenantId })
      .returning()
    return row
  }

  async updateZone(tenantId: string, id: string, data: any) {
    const [row] = await this.db
      .update(shippingZones)
      .set(data)
      .where(and(eq(shippingZones.tenantId, tenantId), eq(shippingZones.id, id)))
      .returning()
    return row
  }

  async deleteZone(tenantId: string, id: string) {
    await this.db
      .delete(shippingZones)
      .where(and(eq(shippingZones.tenantId, tenantId), eq(shippingZones.id, id)))
  }

  async listActiveMethods(tenantId: string) {
    return this.db
      .select()
      .from(shippingMethods)
      .where(and(eq(shippingMethods.tenantId, tenantId), eq(shippingMethods.isActive, true)))
      .orderBy(asc(shippingMethods.position), asc(shippingMethods.createdAt))
  }

  async createMethod(tenantId: string, data: any) {
    const [row] = await this.db
      .insert(shippingMethods)
      .values({ ...data, tenantId })
      .returning()
    return row
  }

  async updateMethod(tenantId: string, id: string, data: any) {
    const [row] = await this.db
      .update(shippingMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shippingMethods.tenantId, tenantId), eq(shippingMethods.id, id)))
      .returning()
    return row
  }

  async deleteMethod(tenantId: string, id: string) {
    await this.db
      .delete(shippingMethods)
      .where(and(eq(shippingMethods.tenantId, tenantId), eq(shippingMethods.id, id)))
  }
}
