# Change Spec 02b: Granular Partial Refund & Return Ledger Writes

## Overview
This specification details the future enhancement for handling granular item-level returns and partial refund ledger writes against vendor-scoped orders.

## Current State
In `VendorService.handlePaymentRefunded`, when a payment provider refund webhook fires:
```ts
const refundRatio = refundAmount / paymentAmount
const vendorRefundAmount = Math.round(saleRow.amount * refundRatio)
const grossRefundAmount = Math.round((saleRow.grossAmount || 0) * refundRatio)
const commissionRefundAmount = Math.round((saleRow.commissionAmount || 0) * refundRatio)
```
Proportional refund calculation scales gross sale, commission, and net vendor payout proportionally based on the overall order refund percentage.

## Proposed Item-Level Return Specification

### 1. Extended `handlePaymentRefunded` Interface
Add optional item-level details to `handlePaymentRefunded`:
```ts
export interface ItemRefundDetail {
  orderItemId: string
  refundAmount: number // Amount refunded for this specific item
}

async handlePaymentRefunded(
  orderId: string,
  tenantId: string,
  providerEventId: string,
  refundAmount: number,
  paymentAmount: number,
  itemRefunds?: ItemRefundDetail[],
  db?: Database,
): Promise<void>
```

### 2. Item-Level Ledger Calculations
When `itemRefunds` is provided:
1. Lookup targeted `order_items` records for `orderId`.
2. Compute individual item commission rate: `itemCommission = item.lineTotal * (appliedRate / 100)`.
3. Compute exact net debit for vendor: `vendorDebit = itemRefund.refundAmount - itemCommission`.
4. Insert `REFUND` entry to `vendor_ledger`:
   - `type`: `'REFUND'`
   - `amount`: `-vendorDebit`
   - `grossAmount`: `-itemRefund.refundAmount`
   - `commissionAmount`: `-itemCommission`
   - `idempotencyKey`: `refund:${providerEventId}:${orderItemId}`

### 3. Fallback
If `itemRefunds` is omitted or empty, maintain backwards compatibility with the existing proportional `refundRatio` calculation.
