import type {
  BusinessType,
  CatalogModuleSettings,
  DashboardConfig,
  ModuleConfig,
  PartnerConfig,
  ShippingModuleSettings,
  TenantBusinessConfig,
  TenantFullConfig,
  TenantStorefrontConfig,
} from './tenancy.types.js'

/**
 * ConfigService encapsulates all tenant configuration access.
 * Prevents direct JSON access (e.g. config.modules.marketplace.enabled) across the codebase.
 * If the underlying JSON schema changes in the future, ONLY this class changes.
 */
export class ConfigService {
  constructor(private readonly config: TenantFullConfig) {}

  /** Returns the full raw configuration object. */
  getRawConfig(): TenantFullConfig {
    return this.config
  }

  // --- Business Type Helpers ---

  getBusinessType(): BusinessType {
    return this.config.businessType ?? 'ECOMMERCE'
  }

  isEcommerce(): boolean {
    return this.getBusinessType() === 'ECOMMERCE'
  }

  isMarketplace(): boolean {
    return (
      this.getBusinessType() === 'MARKETPLACE' ||
      (this.config.modules?.marketplace?.enabled ?? false)
    )
  }

  isFulfillment(): boolean {
    return (
      this.getBusinessType() === 'FULFILLMENT' ||
      (this.config.modules?.fulfillment?.enabled ?? false)
    )
  }

  isRestaurant(): boolean {
    return (
      this.getBusinessType() === 'RESTAURANT' ||
      (this.config.modules?.restaurant?.enabled ?? false)
    )
  }

  isWholesale(): boolean {
    return this.getBusinessType() === 'WHOLESALE'
  }

  isBooking(): boolean {
    return (
      this.getBusinessType() === 'BOOKING' ||
      (this.config.modules?.booking?.enabled ?? false)
    )
  }

  // --- Module Accessors ---

  isModuleEnabled(moduleName: keyof ModuleConfig): boolean {
    return this.config.modules?.[moduleName]?.enabled ?? false
  }

  getModuleSettings<T = Record<string, unknown>>(moduleName: keyof ModuleConfig): T | null {
    const mod = this.config.modules?.[moduleName]
    if (!mod || !mod.enabled) return null
    return mod as unknown as T
  }

  // --- Storefront & Localization Helpers ---

  getStorefrontConfig(): TenantStorefrontConfig {
    return this.config.storefront
  }

  getCurrency(): string {
    return this.config.storefront?.localization?.currency ?? 'INR'
  }

  getCurrencySymbol(): string {
    return this.config.storefront?.localization?.currencySymbol ?? '₹'
  }

  getTimezone(): string {
    return this.config.storefront?.localization?.timezone ?? 'Asia/Kolkata'
  }

  getDefaultLanguage(): string {
    return this.config.storefront?.localization?.defaultLanguage ?? 'en'
  }

  getThemePreset(): string {
    return this.config.storefront?.theme?.preset ?? 'default'
  }

  // --- Dashboard Config Helpers ---

  getDashboardConfig(): DashboardConfig {
    return (
      this.config.dashboard ?? {
        defaultPage: 'orders',
        widgets: ['sales', 'orders', 'inventory'],
        hiddenMenus: [],
      }
    )
  }

  getDefaultDashboardPage(): string {
    return this.getDashboardConfig().defaultPage
  }

  isMenuHidden(menuId: string): boolean {
    return this.getDashboardConfig().hiddenMenus.includes(menuId)
  }

  // --- Partner Config Helpers ---

  getPartnerConfig(): PartnerConfig {
    return (
      this.config.partner ?? {
        seller: this.isMarketplace(),
        fulfillment: this.isFulfillment(),
        warehouse: false,
        courier: false,
      }
    )
  }

  isPartnerSellerEnabled(): boolean {
    return this.getPartnerConfig().seller
  }

  isPartnerFulfillmentEnabled(): boolean {
    return this.getPartnerConfig().fulfillment
  }

  // --- Self-Contained Catalog Module Helpers ---

  getCatalogConfig(): CatalogModuleSettings {
    return (
      this.config.modules?.catalog ?? {
        enabled: true,
        variants: true,
        attributes: true,
        collections: true,
        brands: true,
      }
    )
  }

  hasVariants(): boolean {
    return this.getCatalogConfig().variants ?? true
  }

  hasAttributes(): boolean {
    return this.getCatalogConfig().attributes ?? true
  }

  hasCollections(): boolean {
    return this.getCatalogConfig().collections ?? true
  }

  hasBrands(): boolean {
    return this.getCatalogConfig().brands ?? true
  }

  // --- Self-Contained Shipping Module Helpers ---

  getShippingConfig(): ShippingModuleSettings {
    return (
      this.config.modules?.shipping ?? {
        enabled: true,
        strategy: 'flat_rate',
        flatRateCents: 4900,
        freeShippingThresholdCents: null,
        defaultProvider: 'Shiprocket',
        allowPickup: false,
      }
    )
  }

  // --- Business & Operating Config Helpers ---

  getBusinessConfig(): TenantBusinessConfig {
    return this.config.business
  }

  getOrderWorkflow(): string {
    return this.config.business?.orderWorkflow ?? 'AUTO_CONFIRM'
  }

  getTaxConfig() {
    return this.config.business?.taxes
  }

  getInventoryConfig() {
    return this.config.business?.inventory
  }

  getCheckoutConfig() {
    return this.config.business?.checkout
  }

  getPaymentConfig() {
    return this.config.business?.payments
  }
}
