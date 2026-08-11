-- Add business_type column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) NOT NULL DEFAULT 'ECOMMERCE';

-- Add full_config JSONB column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS full_config JSONB NOT NULL DEFAULT '{
  "$schemaVersion": 1,
  "businessType": "ECOMMERCE",
  "storefront": {
    "theme": {
      "preset": "default",
      "fontHeading": "Outfit",
      "fontBody": "Inter",
      "colors": {
        "primary": "#3b82f6",
        "secondary": "#10b981",
        "background": "#ffffff",
        "surface": "#f3f4f6",
        "text": "#1f2937"
      }
    },
    "localization": {
      "currency": "INR",
      "currencySymbol": "₹",
      "timezone": "Asia/Kolkata",
      "defaultLanguage": "en",
      "supportedLanguages": ["en"]
    },
    "auth": {
      "emailPassword": true,
      "phoneOtp": false,
      "googleOAuth": true,
      "guestCheckout": true
    },
    "branding": {
      "logoUrl": null,
      "faviconUrl": null
    }
  },
  "business": {
    "orderWorkflow": "AUTO_CONFIRM",
    "taxes": {
      "inclusivePricing": true,
      "defaultTaxRatePercent": 18.0
    },
    "inventory": {
      "trackStock": true,
      "allowBackorders": false,
      "lowStockThreshold": 5,
      "autoReleaseReservedSec": 900
    },
    "checkout": {
      "minimumOrderValueCents": 0,
      "requirePhone": false,
      "maxCartItems": 50
    },
    "payments": {
      "provider": "razorpay",
      "isTestMode": true,
      "enabledMethods": ["COD", "CARD", "UPI"]
    }
  },
  "dashboard": {
    "defaultPage": "orders",
    "widgets": ["sales", "orders", "inventory"],
    "hiddenMenus": []
  },
  "partner": {
    "seller": false,
    "fulfillment": false,
    "warehouse": false,
    "courier": false
  },
  "modules": {
    "catalog": { "enabled": true, "variants": true, "attributes": true, "collections": true, "brands": true },
    "shipping": { "enabled": true, "strategy": "flat_rate", "flatRateCents": 4900, "freeShippingThresholdCents": null, "defaultProvider": "Shiprocket", "allowPickup": false },
    "marketplace": { "enabled": false },
    "fulfillment": { "enabled": false },
    "restaurant": { "enabled": false },
    "booking": { "enabled": false },
    "warehouse": { "enabled": false }
  },
  "extensions": {}
}'::jsonb;
