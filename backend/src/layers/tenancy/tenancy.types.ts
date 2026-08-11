export type TenantMode = 'SINGLE_VENDOR' | 'MULTI_VENDOR'
export type TenantStatus = 'onboarding' | 'active' | 'suspended'
export type PaymentProvider = 'razorpay' | 'stripe' | 'payu' | 'sandbox'
export type ShippingStrategy = 'flat_rate' | 'weight_based' | 'vendor_managed' | 'carrier_api' | 'slot_based' | 'distance_based'

export type BusinessType =
  | 'ECOMMERCE'
  | 'MARKETPLACE'
  | 'FULFILLMENT'
  | 'RESTAURANT'
  | 'WHOLESALE'
  | 'BOOKING'

export interface TenantStorefrontConfig {
  theme: {
    preset: string
    fontHeading: string
    fontBody: string
    colors: {
      primary: string
      secondary: string
      background: string
      surface: string
      text: string
      [key: string]: string
    }
  }
  localization: {
    currency: string
    currencySymbol: string
    timezone: string
    defaultLanguage: string
    supportedLanguages: string[]
  }
  auth: {
    emailPassword: boolean
    phoneOtp: boolean
    googleOAuth: boolean
    guestCheckout: boolean
  }
  branding: {
    logoUrl: string | null
    faviconUrl: string | null
  }
}

export interface TenantBusinessConfig {
  orderWorkflow: string
  taxes: {
    inclusivePricing: boolean
    defaultTaxRatePercent: number
  }
  inventory: {
    trackStock: boolean
    allowBackorders: boolean
    lowStockThreshold: number
    autoReleaseReservedSec: number
  }
  checkout: {
    minimumOrderValueCents: number
    requirePhone: boolean
    maxCartItems: number
  }
  payments: {
    provider: PaymentProvider
    isTestMode: boolean
    enabledMethods: string[]
  }
}

export interface DashboardConfig {
  defaultPage: string
  widgets: string[]
  hiddenMenus: string[]
}

export interface PartnerConfig {
  seller: boolean
  fulfillment: boolean
  warehouse: boolean
  courier: boolean
}

export interface ModuleSettings {
  enabled: boolean
  [key: string]: unknown
}

export interface CatalogModuleSettings extends ModuleSettings {
  variants?: boolean
  attributes?: boolean
  collections?: boolean
  brands?: boolean
}

export interface ShippingModuleSettings extends ModuleSettings {
  strategy?: ShippingStrategy
  flatRateCents?: number
  freeShippingThresholdCents?: number | null
  defaultProvider?: string
  allowPickup?: boolean
}

export interface MarketplaceModuleSettings extends ModuleSettings {
  sellerApproval?: 'AUTOMATIC' | 'MANUAL'
  commissionType?: 'PERCENTAGE' | 'FLAT'
  commissionRate?: number
  shippingModel?: 'platform_managed' | 'vendor_managed'
}

export interface ModuleConfig {
  catalog?: CatalogModuleSettings
  shipping?: ShippingModuleSettings
  marketplace?: MarketplaceModuleSettings
  fulfillment?: ModuleSettings
  restaurant?: ModuleSettings
  booking?: ModuleSettings
  warehouse?: ModuleSettings
  inventory?: ModuleSettings
  promotions?: ModuleSettings
  [key: string]: ModuleSettings | undefined
}

export interface TenantFullConfig {
  $schemaVersion: number
  businessType: BusinessType
  storefront: TenantStorefrontConfig
  business: TenantBusinessConfig
  dashboard: DashboardConfig
  partner: PartnerConfig
  modules: ModuleConfig
  extensions: Record<string, unknown>
}

export const DEFAULT_FULL_CONFIG: TenantFullConfig = {
  $schemaVersion: 1,
  businessType: 'ECOMMERCE',
  storefront: {
    theme: {
      preset: 'default',
      fontHeading: 'Outfit',
      fontBody: 'Inter',
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        background: '#ffffff',
        surface: '#f3f4f6',
        text: '#1f2937',
      },
    },
    localization: {
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      defaultLanguage: 'en',
      supportedLanguages: ['en'],
    },
    auth: {
      emailPassword: true,
      phoneOtp: false,
      googleOAuth: true,
      guestCheckout: true,
    },
    branding: {
      logoUrl: null,
      faviconUrl: null,
    },
  },
  business: {
    orderWorkflow: 'AUTO_CONFIRM',
    taxes: {
      inclusivePricing: true,
      defaultTaxRatePercent: 18.0,
    },
    inventory: {
      trackStock: true,
      allowBackorders: false,
      lowStockThreshold: 5,
      autoReleaseReservedSec: 900,
    },
    checkout: {
      minimumOrderValueCents: 0,
      requirePhone: false,
      maxCartItems: 50,
    },
    payments: {
      provider: 'razorpay',
      isTestMode: true,
      enabledMethods: ['COD', 'CARD', 'UPI'],
    },
  },
  dashboard: {
    defaultPage: 'orders',
    widgets: ['sales', 'orders', 'inventory'],
    hiddenMenus: [],
  },
  partner: {
    seller: false,
    fulfillment: false,
    warehouse: false,
    courier: false,
  },
  modules: {
    catalog: {
      enabled: true,
      variants: true,
      attributes: true,
      collections: true,
      brands: true,
    },
    shipping: {
      enabled: true,
      strategy: 'flat_rate',
      flatRateCents: 4900,
      freeShippingThresholdCents: null,
      defaultProvider: 'Shiprocket',
      allowPickup: false,
    },
    marketplace: {
      enabled: false,
      sellerApproval: 'MANUAL',
      commissionType: 'PERCENTAGE',
      commissionRate: 10.0,
      shippingModel: 'platform_managed',
    },
    fulfillment: { enabled: false },
    restaurant: { enabled: false },
    booking: { enabled: false },
    warehouse: { enabled: false },
  },
  extensions: {},
}

export interface TenantFeatures {
  wishlist: boolean
  loyalty: boolean
  reviews: boolean
  cart_abandonment: boolean
  inventory_management: boolean
}

export interface TenantBranding {
  primary_color: string
  secondary_color: string
  logo_url: string | null
  favicon_url: string | null
  font: string
}

export interface TenantNotificationConfig {
  from_name: string
  from_email: string
}

export interface TenantConfig {
  shipping_flat_rate: number
  free_shipping_threshold: number | null
  shipping_strategy: ShippingStrategy
  marketplace_shipping_model?: 'platform_managed' | 'vendor_managed'
  earn_rate: number
  redeem_rate: number
  cart_abandonment_delay_hours: number
  coupon_loyalty_stacking: boolean
  return_window_days: number
}

export interface TenantPaymentConfig {
  provider: PaymentProvider
  credentials: Record<string, string>
  webhook_secret?: string
  is_test_mode: boolean
}

export interface Tenant {
  id: string
  name: string
  slug: string
  customDomain: string | null
  mode: TenantMode
  status: TenantStatus
  currency: string
  timezone: string
  features: TenantFeatures
  branding: TenantBranding
  notificationConfig: TenantNotificationConfig
  taxConfig: Record<string, unknown> | null
  payoutConfig: Record<string, unknown> | null
  billingPlanId: string | null
  trialEndsAt: Date | null
  createdAt: Date
  updatedAt: Date
  businessType?: BusinessType
  fullConfig?: TenantFullConfig
}

export interface TenantWithConfig {
  tenant: Tenant
  config: TenantConfig
  payment: TenantPaymentConfig | null
  fullConfig?: TenantFullConfig
}

export interface TenantStats {
  tenantId: string
  totalRevenue: number
  totalOrders: number
  totalCommission: number
  totalVendors: number
  totalCustomers: number
  updatedAt: Date
}

export interface TenantContext {
  tenantId: string
  slug: string
  customDomain: string | null
  mode: TenantMode
  status: TenantStatus
  features: TenantFeatures
  config: TenantConfig & {
    currency: string
    timezone: string
  }
  branding: {
    primary_color: string
    secondary_color: string
    logo_url: string
    favicon_url: string
    font: string
  }
  payment: {
    provider: PaymentProvider
    credentials: Record<string, string>
  }
  notification: TenantNotificationConfig
  fullConfig?: TenantFullConfig
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  perPage: number
  total: number
}

export interface CreateTenantInput {
  name: string
  slug: string
  customDomain?: string | null
  mode?: TenantMode
  businessType?: BusinessType
  currency?: string
  timezone?: string
  features?: Partial<TenantFeatures>
  branding?: Partial<TenantBranding>
  notificationConfig?: Partial<TenantNotificationConfig>
  fullConfig?: Partial<TenantFullConfig>
}

export interface UpdateTenantInput {
  name?: string
  customDomain?: string | null
  mode?: TenantMode
  status?: TenantStatus
  businessType?: BusinessType
  currency?: string
  timezone?: string
  features?: Partial<TenantFeatures>
  branding?: Partial<TenantBranding>
  notificationConfig?: Partial<TenantNotificationConfig>
  slug?: string
  fullConfig?: Partial<TenantFullConfig>
}

export interface UpdateTenantConfigInput extends Partial<TenantConfig> {}

export interface UpdatePaymentConfigInput {
  provider?: PaymentProvider
  credentials: Record<string, string>
  webhook_secret: string
  is_test_mode?: boolean
}
