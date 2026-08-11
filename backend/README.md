# OpenShutter Commerce

Nexus Commerce is a multi-tenant, provider-agnostic e-commerce backend built module by module from the docs in [`docs/`](/Users/snehasisshit/openShutter/docs).

## Engineering Structure

Source code is organized by module and layer:

```text
src/
├── index.ts
├── database/
├── lib/
├── middleware/
├── layers/
│   └── tenancy/
└── modules/
    └── {module-name}/
```

Every business module must keep a predictable shape:

```text
src/modules/{name}/
├── {name}.service.ts
├── {name}.repository.ts
├── {name}.routes.ts
├── {name}.schema.ts
├── {name}.types.ts
├── {name}.validators.ts
└── {name}.test.ts
```

Layer modules such as tenancy or vendor follow the same file pattern under `src/layers/`.

## Docs Workflow

Before touching a module:

1. Read `docs/modules/MXX-*/module.json`
2. Read `docs/modules/MXX-*/PRD-MXX.md`
3. Read `docs/modules/MXX-*/DESIGN-MXX.md`
4. Read `docs/CONTRACTS.md` if shared interfaces are involved

## Testing Layout

Unit and focused module tests live with the module:

```text
src/modules/{name}/{name}.test.ts
src/layers/{name}/{name}.test.ts
```

Integration tests live under `tests/integration/` and should be grouped by module:

```text
tests/
└── integration/
    └── m01/
        └── tenancy.integration.test.ts
```

Rules:

- Keep integration tests database-backed when the module owns persistence behavior.
- Prefer one integration file per module until coverage grows large enough to split by flow.
- Do not hide critical cross-module tests inside unrelated module folders.

## Common Commands

- `npm run build`
- `npm test`
- `npm run test:integration:m01`
- `npm run migrate`

## Infra Adapters

The default runtime shape is serverless-friendly:

- Hono app runtime
- Upstash Redis for shared cache and rate limiting
- QStash for delayed jobs and async delivery

Adapters are selected via env so modules stay portable:

- `CACHE_PROVIDER=upstash-redis|noop`
- `JOB_QUEUE_PROVIDER=qstash|noop`

See [.env.example](/Users/snehasisshit/openShutter/.env.example) for the required variables.

## Current State

- `M01 Tenant Management` is implemented and verified with unit tests plus a live Postgres integration test.
- `M02 Auth & Customers` is the next dependency-bound module to build before `M01` can be fully signed off for production admin auth.
