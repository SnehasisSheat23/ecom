# Discount Module

## Goal

Provide one reusable discount engine for every business model.

## Core Tables

- discounts
- discount_targets
- coupons
- coupon_usage

## Discount

Stores discount rules.

Fields

- tenant_id
- vendor_id (nullable)
- type
- value
- status
- start_at
- end_at
- usage_limit

## Discount Targets

Determines where a discount applies.

Target Types

- PRODUCT
- CATEGORY
- COLLECTION
- PRODUCT_CLASS
- BRAND
- ALL_PRODUCTS

## Coupons

Coupon codes.

Examples

- NEW10
- WELCOME
- CAKE20

## Coupon Usage

Tracks

- customer
- coupon
- order
- usage count

## Discount Types

- Percentage
- Fixed Amount
- Buy X Get Y
- Free Shipping
- Cart Discount

## Marketplace

Vendor discounts affect only vendor products.

Marketplace-wide discounts can be created by Tenant Admin.

## Single Vendor

Store owner manages all discounts.

## Price Engine

Product Price

↓

Discount Engine

↓

Applicable Discounts

↓

Final Price

Product table never stores discounted prices.