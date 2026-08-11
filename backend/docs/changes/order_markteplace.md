You are improving the existing OpenShutter architecture.

DO NOT redesign the platform from scratch.
DO NOT break existing APIs or business logic.
Keep backward compatibility wherever possible.

Implement the following architectural improvements:

1. Introduce a Core Partner module.
   - Partner represents any external business entity.
   - Store only shared business information:
     - id
     - tenant_id
     - company_name
     - contact
     - address
     - status
     - tax information
   - Do NOT store marketplace, fulfillment, warehouse or courier-specific fields here.

2. Move business-specific fields into profile tables owned by each module.
   - Marketplace Module
     - seller_profile
     - commission
     - settlement
     - catalog ownership
   - Fulfillment Module
     - fulfillment_profile
     - capacity
     - routing strategy
     - service areas
     - PIN codes
   - Warehouse Module
     - warehouse_profile
   - Courier Module
     - courier_profile

3. Modules own their own business logic.
   - Partner module never knows Marketplace.
   - Partner module never knows Fulfillment.
   - Marketplace never modifies Fulfillment tables.
   - Fulfillment never modifies Marketplace tables.

4. Introduce Checkout as a first-class entity.

Current:

Cart
→ Orders
→ Payment

New:

Cart
→ Checkout
→ Checkout Group
→ Orders
→ Payment

Checkout owns:
- address
- coupon
- taxes
- shipping method
- payment method

Checkout Group owns:
- all generated orders
- payment reference

5. Payment Intent should reference Checkout Group instead of a single Order whenever one payment covers multiple vendor orders.

6. Marketplace should own order splitting.
The Order module should create a logical order.
Marketplace module should split it into seller orders when enabled.

7. Fulfillment must be an independent module.
It should consume Orders but not modify the Order module.
Flow:

Order Created
→ Fulfillment
→ Assign Partner
→ Shipping

8. Inventory should remain generic.
Avoid coupling inventory to marketplace concepts.
Think of inventory ownership as Partner-based instead of Seller-only.

9. Add performed_by to inventory_history to support:
- Admin adjustments
- Imports
- API updates
- Order sales
- Returns
- Manual corrections

10. Introduce an Event Bus.

Example events:
- OrderCreated
- PaymentCaptured
- InventoryChanged
- ShipmentCreated

Modules should react to events instead of directly calling each other whenever possible.

11. Keep module boundaries strict.

Core:
- Users
- Customers
- Partners
- Orders
- Payments

Business Modules:
- Catalog
- Marketplace
- Fulfillment
- Restaurant
- POS
- Warehouse
- Shipping

12. Every new business type must be implemented as a module or profile, never by adding client-specific code into Core.

Review the existing architecture and apply these principles while preserving existing functionality.