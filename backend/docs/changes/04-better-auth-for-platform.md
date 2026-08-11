# Phase 4: Better Auth Integration for Platform (Admins & Vendors)

## Goal
Integrate **Better Auth** to manage fixed **Email & Password** authentication for Platform Users (`users` table: Tenant Admins & Vendor Staff), replacing custom hand-rolled JWT tokens and `customer_refresh_tokens`.

---

## Technical Stack & Compatibility

- **Framework**: Hono + Cloudflare Workers.
- **ORM Adapter**: `@better-auth/drizzle-adapter` with Neon Serverless Postgres.
- **Scope**: Platform Login (`/auth/admin/*` and `/auth/vendor/*`).

---

## Implementation Details

### 1. Better Auth Initialization (`src/lib/better-auth.ts`)

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../database/db.js'
import * as schema from '../database/schema.js'

export const createBetterAuthInstance = (env: Record<string, string>) => {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.userSessions,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    secret: env.APP_SECRET,
    baseURL: env.API_BASE_URL,
  })
}
```

### 2. Middleware Refactoring (`src/middleware/auth.middleware.ts`)

```typescript
export const createPlatformAuthMiddleware = () => {
  return async (c: Context, next: Next) => {
    const auth = createBetterAuthInstance(c.env)
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      throw new AppError('Authentication required', 401, 'auth-required')
    }

    c.set('user', session.user)
    c.set('session', session.session)
    await next()
  }
}
```

---

## Edge Case Handling

1. **Workers Dynamic Environment (`c.env`)**:
   - Better Auth instance is dynamically initialized per request using `c.env` to ensure `APP_SECRET` and DB bindings are available in Cloudflare Workers.

2. **Session Persistence**:
   - Supports both HTTP-only Cookies and Bearer Header tokens for API calls from Next.js or external admin dashboards.
