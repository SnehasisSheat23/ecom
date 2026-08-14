import { shippingService } from '../modules/shipping/shipping.service.js'

async function run() {
  console.log('Testing live Postgres DB query for shipping methods...')
  const methods = await shippingService.getMethods('USD')
  console.log('Methods from PostgreSQL DB:', JSON.stringify(methods, null, 2))
  
  const calc = await shippingService.calculateShippingCost({ currency: 'SAR', methodId: 'standard' })
  console.log('SAR Calculation from DB:', calc)

  console.log('✅ PostgreSQL DB Shipping Integration SUCCESSFUL!')
}

run().catch(console.error)
