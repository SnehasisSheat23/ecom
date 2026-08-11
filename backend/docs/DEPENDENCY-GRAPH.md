# Module Dependency Graph

## Visual

```mermaid
graph TD
    M01["M01 Tenant Management"]

    M02["M02 Auth & Customers"]
    M03["M03 Catalog"]
    M04["M04 Inventory"]
    M05["M05 Shipping"]
    M06["M06 Cart"]
    M07["M07 Orders"]
    M08["M08 Payments"]

    M09["M09 Discounts"]
    M10["M10 Notifications"]
    M11["M11 Cart Abandonment"]
    M12["M12 Loyalty"]
    M13["M13 Reviews"]

    M14["M14 Vendors"]
    M15["M15 Search"]
    M16["M16 Admin"]
    M17["M17 Sales & Analytics"]

    M01 --> M02
    M01 --> M03
    M01 --> M04
    M01 --> M05
    M01 --> M06
    M01 --> M07
    M01 --> M08
    M01 --> M09
    M01 --> M10
    M01 --> M11
    M01 --> M12
    M01 --> M13
    M01 --> M14
    M01 --> M15
    M01 --> M16
    M01 --> M17

    M02 --> M06
    M02 --> M07
    M02 --> M12

    M03 --> M04
    M03 --> M06
    M03 --> M07
    M03 --> M15

    M04 --> M06
    M04 --> M07

    M05 --> M06
    M05 --> M07

    M06 --> M07
    M06 --> M11

    M07 --> M08
    M07 --> M09
    M07 --> M10
    M07 --> M12
    M07 --> M14

    M10 --> M11
    M10 --> M12

    M07 --> M17
    M14 --> M17
```

## Dependency Rules (enforce strictly)

```
M01 must be done before: everything
M02 must be done before: M06, M07, M12
M03 must be done before: M04, M06, M07, M15
M04 must be done before: M06, M07
M05 must be done before: M06, M07
M06 must be done before: M07, M11
M07 must be done before: M08
M08 must be done before: shipping to real users
M10 must be done before: M11, M12 (notification sends)
M14 must be done before: multi-vendor tenants go live
All Phase 1–3 modules before: M16 (admin wraps everything)
```

## Machine-Readable

```json
{
  "M01": { "depends_on": [], "required_by": ["M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12","M13","M14","M15","M16"] },
  "M02": { "depends_on": ["M01"], "required_by": ["M06","M07","M12"] },
  "M03": { "depends_on": ["M01"], "required_by": ["M04","M06","M07","M15"] },
  "M04": { "depends_on": ["M01","M03"], "required_by": ["M06","M07"] },
  "M05": { "depends_on": ["M01"], "required_by": ["M06","M07"] },
  "M06": { "depends_on": ["M01","M02","M03","M04","M05"], "required_by": ["M07","M11"] },
  "M07": { "depends_on": ["M01","M02","M03","M04","M05","M06"], "required_by": ["M08","M09","M10","M12","M14"] },
  "M08": { "depends_on": ["M01","M07"], "required_by": [] },
  "M09": { "depends_on": ["M01"], "required_by": ["M06","M07"] },
  "M10": { "depends_on": ["M01"], "required_by": ["M11","M12"] },
  "M11": { "depends_on": ["M01","M06","M09","M10"], "required_by": [] },
  "M12": { "depends_on": ["M01","M02","M07","M10"], "required_by": [] },
  "M13": { "depends_on": ["M01","M03","M07"], "required_by": [] },
  "M14": { "depends_on": ["M01","M02","M03","M04","M07"], "required_by": [] },
  "M15": { "depends_on": ["M01","M03"], "required_by": [] },
  "M16": { "depends_on": ["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12","M13","M14","M15"], "required_by": [] },
  "M17": { "depends_on": ["M01","M07","M14"], "required_by": ["M16"] }
}
```

## Parallel Work Opportunities

| Parallel Pair | Notes |
|---------------|-------|
| M02 + M03 | Both depend only on M01. Start both on day 2. |
| M04 + M05 | Both depend only on M01/M03. Can run together. |
| M09 + M10 | Both depend only on Phase 1. Start both at Phase 2 start. |
| M12 + M13 | M12 needs M10; M13 is independent. Start M13 immediately in Phase 2. |
| M14 + M15 | Both need stable M03. Can run in parallel. |
