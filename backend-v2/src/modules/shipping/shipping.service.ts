import { eq, desc } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { shippingMethods } from '../../database/schema.js'

export interface ShippingMethodItem {
  id: string
  name: string
  arabicName?: string | null
  description?: string | null
  arabicDescription?: string | null
  estimatedDays: string
  arabicEstimatedDays?: string | null
  isActive: boolean
  isDefault?: boolean
  rates: Record<string, number>
  createdAt?: Date
  updatedAt?: Date
}

export class ShippingService {
  private db = getDatabase()

  async getMethods(currency?: string): Promise<(ShippingMethodItem & { currentRate: number; currentCurrency: string })[]> {
    const targetCurr = (currency || 'AED').toUpperCase()
    const rows = await this.db
      .select()
      .from(shippingMethods)
      .orderBy(desc(shippingMethods.isDefault), shippingMethods.createdAt)

    return rows.map((m) => {
      const ratesMap = (m.rates || {}) as Record<string, number>
      const rate = ratesMap[targetCurr] !== undefined ? ratesMap[targetCurr] : (ratesMap['AED'] ?? 0)
      return {
        id: m.id,
        name: m.name,
        arabicName: m.arabicName,
        description: m.description,
        arabicDescription: m.arabicDescription,
        estimatedDays: m.estimatedDays,
        arabicEstimatedDays: m.arabicEstimatedDays,
        isActive: m.isActive,
        isDefault: m.isDefault,
        rates: ratesMap,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        currentRate: Number(rate),
        currentCurrency: targetCurr,
      }
    })
  }

  async getMethodById(id: string): Promise<ShippingMethodItem | null> {
    const [row] = await this.db.select().from(shippingMethods).where(eq(shippingMethods.id, id)).limit(1)
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      arabicName: row.arabicName,
      description: row.description,
      arabicDescription: row.arabicDescription,
      estimatedDays: row.estimatedDays,
      arabicEstimatedDays: row.arabicEstimatedDays,
      isActive: row.isActive,
      isDefault: row.isDefault,
      rates: (row.rates || {}) as Record<string, number>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async calculateShippingCost(params: {
    methodId?: string
    currency?: string
    subtotal?: number
  }): Promise<{
    methodId: string
    methodName: string
    arabicMethodName?: string | null
    estimatedDays: string
    currency: string
    cost: number
  }> {
    const targetCurrency = (params.currency || 'AED').toUpperCase()
    const all = await this.getMethods(targetCurrency)

    const method =
      all.find((m) => m.id === params.methodId && m.isActive) ||
      all.find((m) => m.isActive && m.isDefault) ||
      all.find((m) => m.isActive) ||
      all[0]

    if (!method) {
      return {
        methodId: 'standard',
        methodName: 'Standard Regional Delivery',
        estimatedDays: '2 - 4 business days',
        currency: targetCurrency,
        cost: 0,
      }
    }

    const ratesMap = method.rates || {}
    const cost = ratesMap[targetCurrency] !== undefined ? ratesMap[targetCurrency] : (ratesMap['AED'] ?? 0)

    return {
      methodId: method.id,
      methodName: method.name,
      arabicMethodName: method.arabicName,
      estimatedDays: method.estimatedDays,
      currency: targetCurrency,
      cost: Number(cost),
    }
  }

  async updateMethod(id: string, updates: Partial<ShippingMethodItem>): Promise<ShippingMethodItem | null> {
    const [existing] = await this.db.select().from(shippingMethods).where(eq(shippingMethods.id, id)).limit(1)
    if (!existing) return null

    const existingRates = (existing.rates || {}) as Record<string, number>
    const mergedRates = updates.rates ? { ...existingRates, ...updates.rates } : existingRates

    if (updates.isDefault) {
      await this.db.update(shippingMethods).set({ isDefault: false })
    }

    const [updated] = await this.db
      .update(shippingMethods)
      .set({
        name: updates.name !== undefined ? updates.name : existing.name,
        arabicName: updates.arabicName !== undefined ? updates.arabicName : existing.arabicName,
        description: updates.description !== undefined ? updates.description : existing.description,
        arabicDescription: updates.arabicDescription !== undefined ? updates.arabicDescription : existing.arabicDescription,
        estimatedDays: updates.estimatedDays !== undefined ? updates.estimatedDays : existing.estimatedDays,
        arabicEstimatedDays: updates.arabicEstimatedDays !== undefined ? updates.arabicEstimatedDays : existing.arabicEstimatedDays,
        isActive: updates.isActive !== undefined ? updates.isActive : existing.isActive,
        isDefault: updates.isDefault !== undefined ? updates.isDefault : existing.isDefault,
        rates: mergedRates,
        updatedAt: new Date(),
      })
      .where(eq(shippingMethods.id, id))
      .returning()

    return {
      id: updated.id,
      name: updated.name,
      arabicName: updated.arabicName,
      description: updated.description,
      arabicDescription: updated.arabicDescription,
      estimatedDays: updated.estimatedDays,
      arabicEstimatedDays: updated.arabicEstimatedDays,
      isActive: updated.isActive,
      isDefault: updated.isDefault,
      rates: (updated.rates || {}) as Record<string, number>,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }
  }

  async createMethod(data: Omit<ShippingMethodItem, 'id'> & { id?: string }): Promise<ShippingMethodItem> {
    const slug =
      data.id ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      `method-${Date.now()}`

    if (data.isDefault) {
      await this.db.update(shippingMethods).set({ isDefault: false })
    }

    const [created] = await this.db
      .insert(shippingMethods)
      .values({
        id: slug,
        name: data.name,
        arabicName: data.arabicName || null,
        description: data.description || null,
        arabicDescription: data.arabicDescription || null,
        estimatedDays: data.estimatedDays || '2 - 4 business days',
        arabicEstimatedDays: data.arabicEstimatedDays || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isDefault: data.isDefault !== undefined ? data.isDefault : false,
        rates: data.rates || {},
      })
      .returning()

    return {
      id: created.id,
      name: created.name,
      arabicName: created.arabicName,
      description: created.description,
      arabicDescription: created.arabicDescription,
      estimatedDays: created.estimatedDays,
      arabicEstimatedDays: created.arabicEstimatedDays,
      isActive: created.isActive,
      isDefault: created.isDefault,
      rates: (created.rates || {}) as Record<string, number>,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    }
  }

  async deleteMethod(id: string): Promise<boolean> {
    const result = await this.db.delete(shippingMethods).where(eq(shippingMethods.id, id)).returning()
    return result.length > 0
  }
}

export const shippingService = new ShippingService()
