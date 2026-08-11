# Partner Module

## Purpose

The **Partner Module** represents any external business entity that works with a tenant.

A Partner is **not** a seller, warehouse, or courier.

Those are **roles/capabilities** provided by other modules.

The Partner module only stores the shared identity.

---

# Responsibility

The Partner module owns:

* Company Name
* Contact Information
* Address
* GST / Tax Information
* Status
* Basic Documents

It **does not** know anything about:

* Products
* Commissions
* PIN Codes
* Warehouses
* Couriers

Those belong to their respective modules.

---

# Architecture

```text
Partner
│
├── Common Business Information
│
├── Marketplace Module
│      └── Seller Profile
│
├── Fulfillment Module
│      └── Fulfillment Profile
│
├── Warehouse Module
│      └── Warehouse Profile
│
└── Courier Module
       └── Courier Profile
```

---

# Marketplace

Marketplace extends a Partner by creating a Seller Profile.

Example capabilities:

* Sells Products
* Commission
* Settlement
* Catalog Ownership

The Partner module knows nothing about these fields.

---

# Fulfillment

Fulfillment extends a Partner by creating a Fulfillment Profile.

Example capabilities:

* Service Areas
* PIN Codes
* Capacity
* Routing Rules
* Time Slots

The Partner module knows nothing about fulfillment logic.

---

# Warehouse

Warehouse extends a Partner.

Example capabilities:

* Warehouse Code
* Inventory
* Storage Capacity

---

# Courier

Courier extends a Partner.

Example capabilities:

* Tracking
* AWB
* Shipping Integration

---

# One Partner, Multiple Roles

One company can participate in multiple modules.

Example:

```text
ABC Logistics

Partner
│
├── Seller Profile
├── Fulfillment Profile
└── Courier Profile
```

No duplicate partner records are created.

---

# Module Ownership

```text
Partner Module
    ↓
Stores identity

Marketplace Module
    ↓
Stores seller business data

Fulfillment Module
    ↓
Stores fulfillment business data

Warehouse Module
    ↓
Stores warehouse data

Courier Module
    ↓
Stores courier data
```

Each module owns only its own business logic.

---

# Rules

* Never store Marketplace fields inside the Partner module.
* Never store Fulfillment fields inside the Partner module.
* Never let one module modify another module's profile.
* All modules reference the same `partner_id`.
* A Partner may exist without any profile.
* A Partner may have one or many profiles depending on enabled modules.

---

# Mental Model

Think of a Partner as a company record.

Modules simply give that company different business capabilities.

```text
Partner
        ↓
"Who are you?"

Marketplace
        ↓
"What do you sell?"

Fulfillment
        ↓
"How do you fulfill orders?"

Warehouse
        ↓
"Where do you store inventory?"

Courier
        ↓
"How do you deliver?"
```

The Partner module is the shared identity. Every other module extends it instead of replacing it.
