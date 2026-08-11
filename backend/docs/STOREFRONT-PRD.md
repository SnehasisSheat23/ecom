# Storefront PRD

**Status:** Placeholder — to be written before Phase 4
**Reference:** `MASTER-PRD.md` Section 3.1 (architecture), `TIMELINE.md` Phase 4

---

## Scope

This document will cover:

- Next.js app architecture
- Tenant-aware middleware (hostname → tenant config)
- ISR pages: `/`, `/products`, `/products/[slug]`, `/vendors/[slug]`, `/pages/[slug]`
- CSR pages: `/cart`, `/checkout`, `/order/confirm/[id]`, `/orders/track`, `/account`
- Tenant-aware theming from branding config
- SEO: canonical URLs, OG tags, JSON-LD on all catalog pages
- Sitemap + robots.txt per tenant
- Core Web Vitals targets (LCP < 2.5s on mobile)

## Prerequisites

- All Phase 1–3 backend modules complete
- API contracts stable

---

*To be expanded before Phase 4 begins.*
