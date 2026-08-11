# Future Scope & Architecture Roadmap

This document outlines planned improvements and architectural considerations for the openShutter multi-tenant marketplace system.

## 1. Product Approval System
Currently, products transition directly to an `active` state upon creation by vendors. To maintain quality control, a formal approval workflow should be implemented.

### Proposed Workflow
1. **Submit for Review**: Vendors create products in a `draft` or `pending_approval` state.
2. **Admin Review**: Tenant admins receive notification of new products requiring review.
3. **Approval/Rejection**: 
   - **Approve**: Status changes to `active` and product appears on the storefront.
   - **Reject**: Status changes to `rejected`. Admins should be able to provide a `rejection_reason`.
4. **Resubmission**: Vendors update rejected products, which puts them back into `pending_approval`.

### Required Changes
- **Schema**: Add `pending_approval` and `rejected` to `product_status` enum. Add `rejection_reason` to `products` table.
- **Service Logic**: Modify `CatalogService.createProduct` and `updateProduct` to enforce status transitions.
- **UI**: 
    - Admin "Review Queue" dashboard.
    - Vendor portal status indicators and feedback loops.

## 2. Advanced Marketplace Features
- **Vendor Micro-Stores**: Expand the vendor slug architecture into full-featured mini-storefronts within the main tenant's domain.
- **Vendor-Specific Shipping**: Allow vendors to manage their own shipping rates or configurations if the tenant is in `MULTI_VENDOR` mode (using the `shipping_strategy` enum).
- **Automated Payouts**: Integrate the `vendor_ledger` with payment providers (e.g., Razorpay/Stripe) to automate vendor distributions after commissions are deducted.

## 3. Performance & Scalability
- **Elasticsearch/Algolia Integration**: As the global catalog grows across vendors, implement a more robust search engine to replace basic Postgres `LIKE` or `tsvector` queries.
- **Image Optimization Pipeline**: Automate the generation of multiple WebP sizes for vendor-uploaded images via a worker or CDN-level optimization.
