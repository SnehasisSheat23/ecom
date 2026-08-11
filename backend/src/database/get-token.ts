import { createAccessToken } from '../lib/auth.js'
import { requireEnv } from '../lib/env.js'

async function generateToken() {
  const email = requireEnv('SUPER_ADMIN_EMAIL')
  
  // A Super Admin token doesn't strictly need a real tenantId for global routes,
  // but we use a placeholder that won't trigger any scoping errors.
  const token = await createAccessToken({
    customerId: 'super-admin-id',
    tenantId: 'global',
    email: email,
    tenantMode: 'MULTI_VENDOR',
    ttlSeconds: 3600 // 1 hour
  })

  console.log(token)
}

generateToken().catch(console.error)
