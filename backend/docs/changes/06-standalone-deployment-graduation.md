# Phase 5: Standalone Deployment & 4-Model Business Architecture

## Goal
Design a clean, two-axis deployment model using an environment variable (`DEPLOYMENT_MODE`) and a per-tenant database column (`tenants.mode`), allowing the platform to seamlessly run in 4 distinct operational modes with 100% code reuse.

---

## The 4 Deployment Models Matrix

```
                    ┌──────────────────────────────────────┐
                    │          DEPLOYMENT_MODE (Env)       │
                    ├──────────────────┬───────────────────┤
                    │      saas        │    standalone     │
    ┌───────────────┼──────────────────┼───────────────────┤
    │ MULTI_VENDOR  │ 1. SaaS          │ 2. Standalone     │
t   │               │    Marketplace   │    Marketplace    │
e   │               │    (Hosts many   │    (Dedicated     │
n   │               │     marketplaces)│     Etsy/Amazon)  │
a   ├───────────────┼──────────────────┼───────────────────┤
n   │ SINGLE_VENDOR │ 3. SaaS          │ 4. Standalone     │
t   │               │    E-Commerce    │    E-Commerce     │
s   │               │    (Hosts many   │    (Dedicated     │
.mode               │     single stores│     Shopify store)│
    └───────────────┼──────────────────┼───────────────────┘
```

---

## Configuration Controls

| Control | Type | Location | Purpose |
|:---|:---|:---|:---|
| **`DEPLOYMENT_MODE`** | Environment Var | `.env` (`saas` \| `standalone`) | Controls whether tenant resolution is dynamic (domain/header) or hardcoded to a default single tenant. |
| **`tenants.mode`** | DB Column | `tenants` table (`SINGLE_VENDOR` \| `MULTI_VENDOR`) | Controls whether multi-vendor features (vendor portal, sub-orders, seller settlements) are active for that specific tenant. |

---

## Environment & Database Configurations

### Model 1: SaaS Multi-Vendor Platform (Default)
```bash
DEPLOYMENT_MODE=saas
# Database: Each tenant row has mode = 'MULTI_VENDOR'
```

### Model 2: Standalone Multi-Vendor Marketplace (Dedicated Etsy/Amazon)
```bash
DEPLOYMENT_MODE=standalone
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
# Database: The standalone tenant row has mode = 'MULTI_VENDOR'
```

### Model 3: SaaS Single-Vendor Platform (Hosts multiple single-vendor stores)
```bash
DEPLOYMENT_MODE=saas
# Database: Tenants have mode = 'SINGLE_VENDOR'
```

### Model 4: Standalone Single E-Commerce Store (Dedicated Shopify Store)
```bash
DEPLOYMENT_MODE=standalone
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
# Database: The standalone tenant row has mode = 'SINGLE_VENDOR'
```

---

## Middleware Implementation (`src/middleware/tenant.middleware.ts`)

```typescript
export const createTenantMiddleware = (service: TenancyService): MiddlewareHandler => {
  return async (c, next) => {
    const mode = c.env.DEPLOYMENT_MODE || 'saas'

    if (mode === 'standalone') {
      // STANDALONE MODE: Automatically inject default tenant context
      c.set('tenant', await service.getTenantContext(
        c.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
      ))
      await next()
      return
    }

    // SAAS MODE: Dynamic resolution via header or domain name
    const tenantId = c.req.header('x-tenant-id')
    const tenant = tenantId 
      ? await service.getTenantContext(tenantId)
      : await service.resolveByHostname(new URL(c.req.url).hostname)

    c.set('tenant', tenant)
    await next()
  }
}
```

---

## Graduation Workflow (Self-Hosting Migration)

1. **Extract Data**: Dump rows where `tenant_id = target_tenant_id` across all tables.
2. **Restore**: Load data into the tenant's new private Neon/Postgres database.
3. **Configure**: Set `DEPLOYMENT_MODE=standalone` and `DEFAULT_TENANT_ID=target_tenant_id` in `.env`.
4. **Run**: The app runs as a dedicated standalone instance with zero multi-tenancy UI overhead or code changes.
