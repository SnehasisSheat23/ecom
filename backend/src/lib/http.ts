import type { TenantContext } from '../layers/tenancy/tenancy.types.js'
import type { AuthenticatedCustomer } from '../modules/customers/customers.types.js'

export interface AppEnv {
  Variables: {
    tenant: TenantContext
    customer?: AuthenticatedCustomer
    user?: any
    isAdmin?: boolean
    isSuperAdmin?: boolean
    activePartnerId?: string
  }
}

export type AppBindings = {
  Bindings: {
    SEARCH_KV: any // KVNamespace
    ASSETS_BUCKET: any // R2Bucket
    API_BASE_URL: string
    DATABASE_URL?: string
    APP_SECRET?: string
    DEPLOYMENT_MODE?: string
    DEFAULT_TENANT_ID?: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
  }
  Variables: AppEnv['Variables']
}
