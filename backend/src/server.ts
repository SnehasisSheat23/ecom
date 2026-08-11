import { serve } from '@hono/node-server'
import { createApp } from './lib/app.js'
import { getDatabase } from './lib/db.js'
import { initializeEnvSource } from './lib/env.js'
import { DrizzleTenancyRepository } from './layers/tenancy/tenancy.repository.js'
import { CustomerRepository } from './modules/customers/customers.repository.js'
import { TenancyService } from './layers/tenancy/tenancy.service.js'
import { getCacheProvider } from './providers/cache/cache.factory.js'

initializeEnvSource(process.env as any)

const db = getDatabase()
const tenancyRepository = new DrizzleTenancyRepository(db)
const customerRepository = new CustomerRepository(db)
const cacheProvider = getCacheProvider()

const tenancyService = new TenancyService(
  tenancyRepository,
  customerRepository,
  cacheProvider
)

const app = createApp({
  tenancyService,
  db,
})

const port = Number(process.env.PORT || 8787)

console.log(`Starting Hono Node server on port ${port}...`)

serve({
  fetch: app.fetch,
  port,
})
