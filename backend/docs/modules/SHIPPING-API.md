# Shipping & Delivery API Reference

This document provides a comprehensive guide to the Shipping and Delivery module APIs in the openShutter backend.

## Overview

The system is divided into two modules:
- **Shipping Module:** Handles pricing, zone matching, and rate estimation.
- **Delivery Module:** Handles logistics execution, carrier integration, and tracking.

---

## 1. Public & Customer APIs

### Get Shipping Estimate
Calculate shipping options for a cart or a specific address.

- **Endpoint:** `GET /shipping/estimate`
- **Rate Limit:** 120 requests/minute
- **Query Parameters:**
  - `address_id` (UUID, optional): The ID of a saved customer address.
  - `subtotal` (Integer, optional): The cart subtotal in subunits (e.g., paise).
  - `is_digital_only` (Boolean, optional): Set to `true` if the cart only contains digital items.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "standard",
      "label": "Standard Shipping",
      "description": "3-5 business days",
      "estimated_days": 5,
      "amount": 4900
    },
    {
      "id": "express",
      "label": "Express Shipping",
      "description": "1-2 business days",
      "estimated_days": 2,
      "amount": 15000
    }
  ]
}
```

---

## 2. Vendor APIs (Fulfillment)

All vendor endpoints require authentication and an active vendor context.

### Get Vendor Delivery Configuration
Fetch the carrier credentials and settings for the active vendor.

- **Endpoint:** `GET /vendor/delivery/config`
- **Authentication:** Required (Bearer Token)

**Response (200 OK):**
Note: Sensitive fields like `apiKey` and `authToken` are masked.
```json
{
  "data": {
    "id": "uuid",
    "provider": "delhivery",
    "credentials": {
      "authToken": "********",
      "pickupPincode": "560001",
      "pickupLocationName": "Warehouse A"
    },
    "isActive": true
  }
}
```

### Upsert Vendor Delivery Configuration
Configure carrier settings (e.g., Delhivery, Shiprocket) for the vendor.

- **Endpoint:** `POST /vendor/delivery/config`
- **Authentication:** Required (Bearer Token)
- **Request Body:**
```json
{
  "provider": "delhivery", // Options: 'manual', 'delhivery', 'shiprocket'
  "credentials": {
    "authToken": "your-api-token",
    "baseUrl": "https://staging-express.delhivery.com",
    "pickupPincode": "560001",
    "pickupLocationName": "Primary Warehouse",
    "pickupAddress": "123 Logistics Park",
    "pickupCity": "Bangalore",
    "pickupState": "Karnataka",
    "pickupCountry": "IN",
    "pickupPhone": "9999999999"
  },
  "isActive": true
}
```

---

## 3. Admin APIs (Management)

These endpoints require Admin or SuperAdmin privileges.

### List Shipping Methods
- **Endpoint:** `GET /admin/shipping/methods`
- **Response:** Array of all shipping methods.

### Create Shipping Method
- **Endpoint:** `POST /admin/shipping/methods`
- **Request Body:**
```json
{
  "name": "Same Day Delivery",
  "strategy": "flat",
  "flatRate": 25000,
  "estimatedDays": 1,
  "isActive": true,
  "position": 0,
  "vendorId": "uuid", // Optional
  "zoneId": "uuid"    // Optional
}
```

### Update Shipping Method
- **Endpoint:** `PATCH /admin/shipping/methods/:id`

### Delete Shipping Method
- **Endpoint:** `DELETE /admin/shipping/methods/:id`

---

## 3.1 Admin APIs (Zones)

### List Shipping Zones
- **Endpoint:** `GET /admin/shipping/zones`
- **Response:** Array of all shipping zones.

### Create Shipping Zone
- **Endpoint:** `POST /admin/shipping/zones`
- **Request Body:**
```json
{
  "name": "North India",
  "countries": ["IN"],
  "pincodes": ["110*", "121*", "141001"], // Supports wildcards
  "rate": 0,
  "isDefault": false
}
```

### Update Shipping Zone
- **Endpoint:** `PATCH /admin/shipping/zones/:id`

### Delete Shipping Zone
- **Endpoint:** `DELETE /admin/shipping/zones/:id`

---

## 4. Webhooks (External)

### Carrier Webhook Update
Receives live tracking updates from shipping providers.

- **Endpoint:** `POST /webhooks/shipping/:provider`
- **Provider:** `delhivery`, `manual`, etc.
- **Headers:** Provider-specific headers (e.g., `X-Delhivery-HMAC`).

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## Error Codes

| Code | Status | Description |
| :--- | :--- | :--- |
| `pincode-not-serviceable` | 400 | One or more vendors do not deliver to this location. |
| `shipping-config-missing` | 500 | Tenant has no shipping strategy configured. |
| `shipping-option-not-found` | 400 | The selected shipping ID is invalid for this cart. |
| `shipment-not-found` | 404 | Received a webhook for an unknown AWB number. |
| `shipping-strategy-not-implemented` | 501 | The chosen strategy (e.g., weight-based) is not yet active. |
