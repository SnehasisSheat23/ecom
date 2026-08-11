# Shipping Module

The **Shipping Module** handles pincode serviceability check, strategy-based rate calculations, volumetric weight calculations, time-slot schedules, cut-off hours, and marketplace seller payout models.

---

## Architecture Overview

```text
                        POST /shipping/calculate
                                   │
                                   ▼
                        ShippingService.calculateRates()
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
      Strategy Dispatcher                   Volumetric Weight Engine
   - flat_rate                           - Max(actual, volumetric)
   - weight_based                        - L × W × H / 5000
   - slot_based (IST cutoffs)
   - carrier_api (3PL integration)
```

---

## Features

### 1. Slot-Based Delivery & IST Cut-off Locking
- Supports time-slot options (`09:00 - 12:00`, `23:00 - 23:59`, etc.).
- Evaluates same-day cutoff times strictly against **Indian Standard Time (`Asia/Kolkata`)**:
  ```ts
  const timezone = (tenant.config as any)?.storefront?.localization?.timezone || 'Asia/Kolkata'
  ```
- Expired slots on same-day orders are marked `isAvailable: false`.

### 2. Volumetric Weight Calculation
$$\text{Volumetric Weight (g)} = \text{Math.round}\left(\frac{\text{length\_cm} \times \text{width\_cm} \times \text{height\_cm}}{5000} \times 1000\right) \times \text{quantity}$$

$$\text{Billable Weight (g)} = \max(\text{actual\_weight\_g}, \text{volumetric\_weight\_g})$$

### 3. Marketplace Shipping Payout Models
- **`platform_managed`**: $\text{Net Payout} = \text{Product Subtotal} - \text{Commission}$
- **`vendor_managed`**: $\text{Net Payout} = \text{Product Subtotal} + \text{Shipping Fee} - \text{Commission}$

---

## Database Tables

- **`shipping_zones`**: `id`, `tenant_id`, `name`, `pincodes` (`jsonb` array of 2,198 pincodes).
- **`shipping_methods`**: `id`, `tenant_id`, `partner_id`, `zone_id`, `name`, `strategy`, `flat_rate`, `slots` (`jsonb` array of time windows & cutoffs).

---

## API Reference

### `POST /shipping/calculate`
Calculates available shipping options, time-slots, and charges.

```json
{
  "pincode": "110001",
  "deliveryDate": "2026-08-08",
  "items": [
    {
      "productId": "prod-cake-1",
      "quantity": 1,
      "price_cents": 79900,
      "weight_g": 1000,
      "length_cm": 20,
      "width_cm": 20,
      "height_cm": 15
    }
  ]
}
```

---

## Test Suites

Run unit tests:
```bash
npx vitest run src/modules/shipping/tests/slot-based.test.ts \
               src/modules/shipping/tests/volumetric-weight.test.ts \
               src/modules/shipping/shipping.test.ts
```
