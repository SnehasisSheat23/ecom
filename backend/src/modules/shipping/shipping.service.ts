import { AppError } from '../../lib/errors.js'
import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'
import type {
  CalculateShippingInput,
  CartItemForShipping,
  PricingCart,
  PricingCartLine,
  ShippingOption,
  ShippingAddress,
} from './shipping.types.js'
import type { ShippingRepository } from './shipping.repository.js'
import type { DeliveryService } from '../delivery/delivery.service.js'
import type { Database } from '../../lib/db.js'
import { addresses } from '../customers/customers.schema.js'
import { shippingMethods, shippingZones } from './shipping.schema.js'
import { and, eq, or, sql } from 'drizzle-orm'
import { SlotBasedStrategy } from './strategies/slot-based.strategy.js'

const STANDARD_OPTION_ID = 'standard'

const DIGITAL_OPTION: ShippingOption = {
  id: 'digital',
  label: 'Digital Delivery',
  description: 'Instant',
  estimated_days: 0,
  amount: 0,
}

export class ShippingService {
  constructor(
    private readonly repository: ShippingRepository,
    private readonly deliveryService?: DeliveryService,
    private readonly db?: Database,
    private readonly vendorService?: any
  ) {}

  async calculate(input: CalculateShippingInput): Promise<ShippingOption[]> {
    const { items, tenant } = input
    const subtotal = this.resolveSubtotal(items, input.subtotal)
    
    const config = tenant.config
    if (!config) {
      throw new AppError('Tenant shipping configuration is missing', 500, 'shipping-config-missing')
    }

    if (items.length > 0 && items.every((item) => item.product_type === 'digital')) {
      return [DIGITAL_OPTION]
    }

    // Resolve customer shipping pincode (either from snapshot or database ID)
    let destinationPincode: string | null = null
    if (input.address) {
      if (input.address.postal_code) {
        destinationPincode = input.address.postal_code
      } else if ('postalCode' in input.address && typeof (input.address as any).postalCode === 'string') {
        destinationPincode = (input.address as any).postalCode
      } else if (input.address.id && this.db) {
        const addressId = input.address.id
        const [address] = await this.db
          .select()
          .from(addresses)
          .where(and(eq(addresses.tenantId, tenant.tenantId), eq(addresses.id, addressId)))
        if (address) {
          destinationPincode = address.postalCode
        }
      }
    }

    // 1. Early Serviceability Validation (Multi-vendor and Single-store)
    if (destinationPincode && this.vendorService) {
      const vendorIds = [...new Set(items.map((item) => item.partner_id))]
      const isServiceable = await this.vendorService.checkServiceability(
        tenant.tenantId,
        vendorIds,
        destinationPincode
      )
      if (!isServiceable) {
        throw new AppError(
          'One or more vendors do not deliver to this pincode',
          400,
          'pincode-not-serviceable'
        )
      }
    }

    // Ensure strategy is supported
    const validStrategies = ['flat_rate', 'weight_based', 'vendor_managed', 'carrier_api', 'slot_based', 'distance_based']
    if (!validStrategies.includes(config.shipping_strategy)) {
      throw new AppError(
        `Shipping strategy ${config.shipping_strategy} is not fully implemented yet`,
        501,
        'shipping-strategy-not-implemented',
      )
    }

    // 2. Group items by partnerId
    const itemsByVendor = new Map<string | null, CartItemForShipping[]>()
    for (const item of items) {
      const partnerId = item.partner_id
      if (!itemsByVendor.has(partnerId)) {
        itemsByVendor.set(partnerId, [])
      }
      itemsByVendor.get(partnerId)!.push(item)
    }

    // 3. Resolve shipping options per vendor package
    const packageResults: Array<{ partnerId: string | null; options: ShippingOption[] }> = []
    for (const [partnerId, vendorItems] of itemsByVendor.entries()) {
      const pkgSubtotal = this.resolveSubtotal(vendorItems)
      const options = await this.calculatePackageRates(
        tenant,
        partnerId,
        vendorItems,
        destinationPincode,
        input.address,
        pkgSubtotal,
        input
      )
      packageResults.push({ partnerId, options })
    }

    if (packageResults.length === 0) {
      const freeThreshold = tenant.config.free_shipping_threshold
      const isFree = freeThreshold !== null && subtotal >= freeThreshold
      const amount = isFree ? 0 : tenant.config.shipping_flat_rate
      return [
        {
          id: STANDARD_OPTION_ID,
          label: 'Standard Shipping',
          description: '3-5 business days',
          estimated_days: 5,
          amount,
        },
      ]
    }

    // If single package (single vendor / single store), return options directly without consolidation
    if (packageResults.length === 1) {
      const opts = packageResults[0].options
      const freeThreshold = tenant.config.free_shipping_threshold
      const isFree = freeThreshold !== null && subtotal >= freeThreshold
      
      return opts.map(opt => ({
        ...opt,
        amount: isFree ? 0 : opt.amount
      }))
    }

    // 4. Consolidate options across packages
    const consolidatedOptions: ShippingOption[] = []

    const getOptionByType = (options: ShippingOption[], type: 'standard' | 'express'): ShippingOption | null => {
      if (options.length === 0) return null
      
      const match = options.find(opt => {
        const idLower = opt.id.toLowerCase()
        const labelLower = opt.label.toLowerCase()
        if (type === 'express') {
          return idLower.includes('express') || labelLower.includes('express') || idLower.includes('fast') || labelLower.includes('fast')
        } else {
          return idLower.includes('standard') || labelLower.includes('standard') || idLower === 'standard'
        }
      })
      
      if (match) return match
      if (type === 'express') {
        return getOptionByType(options, 'standard') || options[0] || null
      }
      return options[0] || null
    }

    // Build Consolidated Standard
    const standardComponents = packageResults
      .map(res => getOptionByType(res.options, 'standard'))
      .filter((opt): opt is ShippingOption => opt !== null)

    if (standardComponents.length > 0) {
      const totalAmount = standardComponents.reduce((sum, opt) => sum + opt.amount, 0)
      const maxDays = Math.max(...standardComponents.map(opt => opt.estimated_days))
      const isFree = tenant.config.free_shipping_threshold !== null && subtotal >= tenant.config.free_shipping_threshold
      
      consolidatedOptions.push({
        id: 'standard',
        label: 'Standard Shipping',
        description: 'Consolidated shipping',
        estimated_days: maxDays,
        amount: isFree ? 0 : totalAmount
      })
    }

    // Build Consolidated Express
    const hasExpressOption = packageResults.some(res => 
      res.options.some(opt => {
        const idLower = opt.id.toLowerCase()
        const labelLower = opt.label.toLowerCase()
        return idLower.includes('express') || labelLower.includes('express') || idLower.includes('fast') || labelLower.includes('fast')
      })
    )

    if (hasExpressOption) {
      const expressComponents = packageResults
        .map(res => getOptionByType(res.options, 'express'))
        .filter((opt): opt is ShippingOption => opt !== null)

      if (expressComponents.length > 0) {
        const totalAmount = expressComponents.reduce((sum, opt) => sum + opt.amount, 0)
        const maxDays = Math.max(...expressComponents.map(opt => opt.estimated_days))
        const isFree = tenant.config.free_shipping_threshold !== null && subtotal >= tenant.config.free_shipping_threshold
        
        consolidatedOptions.push({
          id: 'express',
          label: 'Express Shipping',
          description: 'Consolidated shipping (Express)',
          estimated_days: maxDays,
          amount: isFree ? 0 : totalAmount
        })
      }
    }

    return consolidatedOptions
  }

  async calculatePackageRates(
    tenant: TenantContext,
    partnerId: string | null,
    items: CartItemForShipping[],
    destinationPincode: string | null,
    address: ShippingAddress | null,
    subtotal: number,
    input?: CalculateShippingInput
  ): Promise<ShippingOption[]> {
    const config = tenant.config
    
    // Calculate total billable weight (max of actual vs volumetric weight)
    const totalBillableWeightGrams = this.calculatePackageBillableWeightGrams(items)

    // 1. Live Carrier API Rate Calculation per Vendor
    if (config.shipping_strategy === 'carrier_api' && this.deliveryService) {
      try {
        const deliveryConfig = await this.deliveryService.getActiveConfig(tenant.tenantId, partnerId)
        if (deliveryConfig && deliveryConfig.provider !== 'manual') {
          const provider = this.deliveryService.getProvider(deliveryConfig.provider)
          
          const originPincode = deliveryConfig.credentials?.pickupPincode || '560001'
          
          const rates = await provider.calculateRates(deliveryConfig.credentials, {
            originPincode,
            destinationPincode: destinationPincode || '110001',
            weightGrams: totalBillableWeightGrams,
            subtotal
          })

          if (rates.length > 0) {
            return rates.map((r: { id: string; label: string; amount: number; estimatedDays: number }) => ({
              id: r.id,
              label: r.label,
              description: `${r.estimatedDays} business days`,
              estimated_days: r.estimatedDays,
              amount: r.amount,
            }))
          }
        }
      } catch (err) {
        console.error(`[Carrier API Rate Calculation Failed for Vendor ${partnerId}]:`, err)
      }
    }

    // 2. Resolve Database Zone and Methods for this Vendor
    let matchedZoneId: string | null = null

    if (destinationPincode && this.db) {
      const zones = await this.db
        .select()
        .from(shippingZones)
        .where(eq(shippingZones.tenantId, tenant.tenantId))

      const countryCode = address?.country_code || 'IN'
      
      const pincodeMatches = (pincode: string, patterns: string[]): boolean => {
        if (patterns.length === 0) return true
        return patterns.some(pattern => {
          if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1)
            return pincode.startsWith(prefix)
          }
          return pincode === pattern
        })
      }

      // Try to find a zone with explicit pincode match
      const pinMatchedZone = zones.find(zone => {
        const countryMatch = zone.countries.includes(countryCode)
        if (!countryMatch) return false
        return zone.pincodes.length > 0 && pincodeMatches(destinationPincode!, zone.pincodes)
      })

      if (pinMatchedZone) {
        matchedZoneId = pinMatchedZone.id
      } else {
        const countryMatchedZone = zones.find(zone => {
          return zone.countries.includes(countryCode) && zone.pincodes.length === 0
        })
        if (countryMatchedZone) {
          matchedZoneId = countryMatchedZone.id
        }
      }
    }

    // Fallback to default zone if not resolved yet
    if (!matchedZoneId && this.db) {
      const [defaultZone] = await this.db
        .select()
        .from(shippingZones)
        .where(and(eq(shippingZones.tenantId, tenant.tenantId), eq(shippingZones.isDefault, true)))
        .limit(1)
      if (defaultZone) {
        matchedZoneId = defaultZone.id
      }
    }

    // Attempt to fetch from database
    let dbMethods: any[] = []
    if (this.db) {
      const queryConditions = [
        eq(shippingMethods.tenantId, tenant.tenantId),
        eq(shippingMethods.isActive, true)
      ]
      if (matchedZoneId) {
        queryConditions.push(eq(shippingMethods.zoneId, matchedZoneId))
      }
      
      if (partnerId) {
        dbMethods = await this.db
          .select()
          .from(shippingMethods)
          .where(and(...queryConditions, eq(shippingMethods.partnerId, partnerId)))
          .orderBy(sql`${shippingMethods.position} ASC, ${shippingMethods.createdAt} ASC`)
      }
      
      if (dbMethods.length === 0) {
        dbMethods = await this.db
          .select()
          .from(shippingMethods)
          .where(and(...queryConditions, sql`${shippingMethods.partnerId} IS NULL`))
          .orderBy(sql`${shippingMethods.position} ASC, ${shippingMethods.createdAt} ASC`)
      }
    } else {
      dbMethods = await this.repository.listActiveMethods(tenant.tenantId)
    }

    // Handle Slot-Based Strategy for Bakery/Perishable tenants (e.g. TFCakes)
    if (config.shipping_strategy === 'slot_based') {
      const slotStrategy = new SlotBasedStrategy()
      return slotStrategy.calculate(
        input || { items, address, tenant, subtotal },
        { dbMethods, totalBillableWeightGrams, destinationPincode }
      )
    }

    if (dbMethods.length > 0) {
      // Filter methods by weight range constraints if defined
      const eligibleMethods = dbMethods.filter((m) => {
        if (m.minWeightG !== null && m.minWeightG !== undefined && totalBillableWeightGrams < m.minWeightG) {
          return false
        }
        if (m.maxWeightG !== null && m.maxWeightG !== undefined && totalBillableWeightGrams > m.maxWeightG) {
          return false
        }
        return true
      })

      const activeList = eligibleMethods.length > 0 ? eligibleMethods : dbMethods

      return activeList.map((method) => {
        let amount = method.flatRate ?? 0
        if (method.strategy === 'weight_based' || method.strategy === 'rate_per_kg') {
          const weightKg = Math.ceil(totalBillableWeightGrams / 1000)
          amount += weightKg * (method.ratePerKg ?? 0)
        }
        return {
          id: method.id,
          label: method.name,
          description: `${method.estimatedDays} business days`,
          estimated_days: method.estimatedDays,
          amount,
        }
      })
    }

    // Default strategy handling (weight_based fallback or flat_rate)
    let amount = tenant.config.shipping_flat_rate
    if (config.shipping_strategy === 'weight_based') {
      const weightKg = Math.ceil(totalBillableWeightGrams / 1000)
      amount = Math.round(amount * (weightKg > 0 ? weightKg : 1))
    }

    return [
      {
        id: STANDARD_OPTION_ID,
        label: 'Standard Shipping',
        description: '3-5 business days',
        estimated_days: 5,
        amount,
      },
    ]
  }

  calculateItemBillableWeightGrams(item: CartItemForShipping): number {
    const qty = item.quantity || 1
    const actualGrams = (item.weight_grams ?? 0) * qty
    const volumetricGrams =
      item.length_cm && item.width_cm && item.height_cm
        ? Math.round(((item.length_cm * item.width_cm * item.height_cm) / 5000) * 1000) * qty
        : 0
    return Math.max(actualGrams, volumetricGrams)
  }

  calculatePackageBillableWeightGrams(items: CartItemForShipping[]): number {
    return items.reduce((sum, item) => sum + this.calculateItemBillableWeightGrams(item), 0)
  }

  async estimateFromQuery(
    tenant: TenantContext,
    query: { subtotal?: number; isDigitalOnly?: boolean; addressId?: string },
  ): Promise<ShippingOption[]> {
    const items: CartItemForShipping[] = query.isDigitalOnly
      ? [
          {
            variant_id: 'digital-estimate',
            quantity: 1,
            unit_price: 0,
            weight_grams: null,
            product_type: 'digital',
            partner_id: null,
          },
        ]
      : []

    return this.calculate({
      items,
      address: query.addressId ? { id: query.addressId } : null,
      tenant,
      subtotal: query.subtotal,
    })
  }

  toPricingItems(items: PricingCartLine[]): CartItemForShipping[] {
    return items.map((item) => ({
      variant_id: item.variantId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      weight_grams: item.weightGrams ?? null,
      length_cm: item.lengthCm ?? null,
      width_cm: item.widthCm ?? null,
      height_cm: item.heightCm ?? null,
      product_type: item.productType,
      partner_id: item.partnerId ?? null,
    }))
  }

  async listMethods(tenantId: string) {
    return this.repository.listActiveMethods(tenantId)
  }

  async createMethod(tenantId: string, data: any) {
    return this.repository.createMethod(tenantId, data)
  }

  async updateMethod(tenantId: string, id: string, data: any) {
    return this.repository.updateMethod(tenantId, id, data)
  }

  async deleteMethod(tenantId: string, id: string) {
    return this.repository.deleteMethod(tenantId, id)
  }

  async listZones(tenantId: string) {
    return this.repository.listZones(tenantId)
  }

  async createZone(tenantId: string, data: any) {
    return this.repository.createZone(tenantId, data)
  }

  async updateZone(tenantId: string, id: string, data: any) {
    return this.repository.updateZone(tenantId, id, data)
  }

  async deleteZone(tenantId: string, id: string) {
    return this.repository.deleteZone(tenantId, id)
  }

  selectOption(options: ShippingOption[], selectedShippingOptionId?: string): ShippingOption | null {
    if (options.length === 0) {
      return null
    }

    if (!selectedShippingOptionId) {
      return options[0] ?? null
    }

    const selected = options.find((option) => option.id === selectedShippingOptionId)
    if (!selected) {
      throw new AppError('Selected shipping option not found', 400, 'shipping-option-not-found')
    }

    return selected
  }

  subtotalFromCart(cart: PricingCart): number {
    if (typeof cart.subtotal === 'number') {
      return cart.subtotal
    }

    return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  }

  private resolveSubtotal(items: CartItemForShipping[], explicitSubtotal?: number): number {
    if (typeof explicitSubtotal === 'number') {
      return explicitSubtotal
    }

    return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  }
}
