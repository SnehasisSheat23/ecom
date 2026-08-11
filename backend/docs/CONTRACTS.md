# Cross-Module Contracts

This file defines every shared TypeScript interface between modules. If your module calls another module's service, the interface **must** be defined here.

**Rule:** Change an interface here → update both the provider and consumer modules.

---

## 1. TenantContext (M01 → all modules)

Injected by tenant middleware into every request context. Every module reads from `ctx.tenant` — never resolves tenant itself.
Repositories and services must pass `tenantId` explicitly into every tenant-scoped query. Tenant isolation is an application contract, not a database session variable.

```typescript
interface TenantContext {
  tenantId: string
  slug: string
  customDomain: string | null
  mode: 'SINGLE_VENDOR' | 'MULTI_VENDOR'
  status: 'onboarding' | 'active' | 'suspended'
  features: {
    wishlist: boolean
    loyalty: boolean
    reviews: boolean
    cart_abandonment: boolean
  }
  config: {
    currency: string                      // ISO 4217: 'INR', 'USD'
    timezone: string                      // IANA: 'Asia/Kolkata'
    earn_rate: number                     // loyalty points per ₹1
    redeem_rate: number                   // ₹1 per N points
    shipping_flat_rate: number            // in smallest currency unit
    free_shipping_threshold: number | null
    shipping_strategy: 'flat_rate' | 'weight_based' | 'vendor_managed' | 'carrier_api'  // default 'flat_rate'
    cart_abandonment_delay_hours: number
    coupon_loyalty_stacking: boolean      // false = coupon OR loyalty, not both
    return_window_days: number
  }
  branding: {
    primary_color: string
    secondary_color: string
    logo_url: string
    favicon_url: string
    font: string
  }
  payment: {
    provider: 'razorpay' | 'stripe' | 'payu'
    credentials: Record<string, string>   // fetched from secrets store, never logged
  }
  notification: {
    from_name: string
    from_email: string
  }
}
```

**Provider:** `src/layers/tenancy/tenant.middleware.ts`
**Consumers:** Every module via `ctx.tenant`

---

## 2. AuthenticatedCustomer (M02 → protected routes)

Set by auth middleware after validating an access token. Modules that need a logged-in customer should read `ctx.customer`.

```typescript
interface AuthenticatedCustomer {
  customerId: string
  tenantId: string
  vendorMemberships: Array<{
    vendorId: string
    role: 'owner' | 'manager' | 'staff'
    status: 'onboarding' | 'active' | 'suspended'
  }>
  activeVendorId: string | null
  email: string
  isAdmin: boolean
  isSuperAdmin: boolean
}
```

`isAdmin` is tenant-scoped and comes from the customer record for the current tenant. `isSuperAdmin` is the only global admin concept.

**Provider:** `src/middleware/auth.middleware.ts`
**Consumers:** Authenticated routes across core modules and M01 admin routes

---

## 3. GuestCartMerger (M02 ↔ M06)

Contract for merging guest cart contents into an authenticated customer cart after login or registration.

```typescript
interface GuestCartMergeRequest {
  tenantId: string
  guestSessionId: string
  customerId: string
}

interface GuestCartMerger {
  mergeGuestCartIntoCustomer(request: GuestCartMergeRequest): Promise<void>
}
```

**Provider:** `src/modules/cart/` in M06
**Consumer:** `src/modules/customers/customers.service.ts`

---

## 4. OrderCreatedEvent (M07 → M14)

Emitted by the orders module after order items are created. Vendor layer subscribes to create sub-orders. If vendor layer is removed, the event fires to nothing — core is unchanged.

```typescript
interface OrderCreatedEvent {
  orderId: string
  tenantId: string
  items: Array<{
    orderItemId: string
    variantId: string
    vendorId: string | null
    quantity: number
    lineTotal: number
  }>
}
```

**Emitter:** `src/modules/orders/orders.service.ts` → `placeOrder()`
**Consumer:** `src/layers/vendor/vendor.service.ts` → creates `order_sub_orders`

The vendor consumer must create exactly one sub-order per unique non-null `vendorId` and persist an item mapping so each `orderItemId` belongs to exactly one vendor sub-order.

---

## 5. PaymentProvider (M08 → providers)

Abstraction layer for payment processors. Modules only call `PaymentService` — never a provider directly.

```typescript
interface CreateOrderParams {
  amount: number              // smallest currency unit (paise for INR)
  currency: string            // ISO 4217
  orderId: string             // internal order ID
  tenantId: string
  metadata: Record<string, string>
}

interface ProviderOrder {
  providerOrderId: string
  providerOrderToken: string  // frontend uses to open payment modal
  amount: number
  currency: string
  status: 'created' | 'attempted' | 'paid'
}

interface WebhookEvent {
  providerEventId: string     // globally unique from provider
  type: NormalizedEventType
  paymentId: string           // provider's payment ID
  orderId: string             // internal order ID (from metadata)
  amount: number
  currency: string
  status: 'paid' | 'failed' | 'refunded'
  rawPayload: object
}

type NormalizedEventType =
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.partially_refunded'

interface RefundParams {
  paymentId: string
  amount: number
  reason: string
  idempotencyKey: string
}

interface RefundResult {
  providerRefundId: string
  status: 'pending' | 'processed' | 'failed'
  amount: number
}

interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<ProviderOrder>
  verifyWebhook(rawBody: string, signature: string, secret: string): void
  parseWebhook(rawPayload: object): WebhookEvent
  initiateRefund(params: RefundParams): Promise<RefundResult>
  healthCheck(): Promise<boolean>
}
```

**Interface:** `src/providers/payment/payment.interface.ts`
**Implementations:** `razorpay.provider.ts`, `stripe.provider.ts` (stub)
**Factory:** `src/providers/payment/payment.factory.ts`

---

## 6. Notification Providers (M10 → providers)

Abstraction for email and WhatsApp delivery. All sends are enqueued through the async job adapter.

```typescript
interface EmailRecipient {
  email: string
  name?: string
}

interface EmailProvider {
  send(
    to: EmailRecipient,
    subject: string,
    html: string,
    fromConfig: { name: string; email: string },
    credentials: Record<string, string>
  ): Promise<string> // returns provider message id
}

interface WhatsAppProvider {
  send(
    to: string, // phone number with country code
    body: string,
    fromConfig: { phone: string },
    credentials: Record<string, string>
  ): Promise<string> // returns provider message id
}
```

**Interfaces:** `src/providers/notification/email.interface.ts`, `whatsapp.interface.ts`
**Implementations:** `resend.provider.ts`, `twilio.provider.ts`

## Async Adapter Rules (shared)

These rules apply to every module that uses the shared queue adapter:

- Consumers must be idempotent and safe under duplicate delivery
- Each module must document retry policy per job type
- Publish failures must emit structured logs with tenant and job identifiers
- Each module must include an integration test for its async path before being considered production-ready

---

## 7. StorageProvider (M03 → providers)

S3-compatible abstraction. All paths are tenant-prefixed internally.

```typescript
interface StorageProvider {
  upload(
    tenantId: string,
    path: string,
    file: Buffer,
    contentType: string
  ): Promise<string>  // returns public URL

  delete(tenantId: string, path: string): Promise<void>

  getSignedUrl(
    tenantId: string,
    path: string,
    expiresIn: number
  ): Promise<string>
}
```

**Interface:** `src/providers/storage/storage.interface.ts`
**Implementation:** `s3.provider.ts` (works for R2, MinIO, AWS S3)

---

## 8. SearchProvider (M15 → providers)

Abstraction for product search. Tenant isolation via separate collections.

```typescript
interface SearchDocument {
  id: string
  tenantId: string
  title: string
  description: string
  slug: string
  categoryNames: string[]
  categoryIds: string[]
  tags: string[]
  price: number
  compareAtPrice: number | null
  sku: string
  vendorId: string | null
  vendorName: string | null
  attributes: Record<string, string>
  imageUrl: string | null
  status: string
  createdAt: number
}

interface SearchQuery {
  query: string
  tenantId: string
  filters?: {
    categoryId?: string
    priceMin?: number
    priceMax?: number
    vendorId?: string
  }
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest'
  page?: number
  perPage?: number
}

interface SearchResult {
  hits: SearchDocument[]
  totalHits: number
  page: number
  totalPages: number
  facets: {
    categories: Array<{ id: string; name: string; count: number }>
    priceRanges: Array<{ label: string; min: number; max: number; count: number }>
  }
}

interface SearchProvider {
  createCollection(tenantId: string): Promise<void>
  deleteCollection(tenantId: string): Promise<void>
  index(tenantId: string, document: SearchDocument): Promise<void>
  remove(tenantId: string, documentId: string): Promise<void>
  search(query: SearchQuery): Promise<SearchResult>
  healthCheck(): Promise<boolean>
}
```

**Interface:** `src/providers/search/search.interface.ts`
**Implementation:** `typesense.provider.ts`

---

## 7. Pricing Pipeline (M05, M09, M12 → lib/pricing.ts)

Central order total calculation. Deferred modules return zero/passthrough until implemented.

```typescript
interface OrderTotal {
  subtotal: number        // sum of line totals
  discount: number        // coupon + loyalty reduction
  shipping: number        // flat rate or 0 if free threshold met
  tax: number             // 0 in v1 (schema hook)
  total: number           // subtotal - discount + shipping + tax
  shippingOptions: ShippingOption[]
  selectedShippingOptionId: string | null
}

interface ShippingOption {
  id: string              // stable identifier: 'standard', 'express', or UUID
  label: string           // 'Standard Shipping'
  description: string     // '3–5 business days'
  estimated_days: number
  amount: number          // in smallest currency unit
  vendor_id?: string      // only set for vendor_managed strategy
}

// M05 returns an array of options — V1 always returns exactly 1 element
// M06 (Cart) displays all options, auto-selects the first in V1
// M07 (Orders) uses the customer's selected option ID from checkout
async function calculateOrderTotal(
  cart: PricingCart,
  tenant: TenantContext,
  shippingService: ShippingService,
  selectedShippingOptionId?: string,   // V1: omit (auto-selects first)
  metadata?: Record<string, unknown>    // Pass cart/order metadata to shipping
): Promise<OrderTotal>
```

**File:** `src/lib/pricing.ts`
**Callers:** `cart.service.ts`, `orders.service.ts`

---

## 9. CatalogVariantSummary (M03 → M04, M06, M07)

Shared shape for downstream modules that need to decide whether inventory logic applies to a variant.

```typescript
interface CatalogVariantSummary {
  variantId: string
  productId: string
  tenantId: string
  sku: string
  title: string
  price: number
  productType: 'physical' | 'digital'
  trackInventory: boolean
  isDeleted: boolean
  productStatus: 'draft' | 'active' | 'archived'
}
```

Contract notes:
- `trackInventory = true` means the variant must be represented in M04 inventory.
- `trackInventory = false` means cart and order flows must not call reserve/release/decrement/restore for that variant.
- `allow_backorder` is an inventory policy for tracked variants only. It is not a replacement for `trackInventory = false`.

**Provider:** `src/modules/catalog/`
**Consumers:** `src/modules/inventory/`, `src/modules/cart/`, `src/modules/orders/`
