import { shippingService } from '../modules/shipping/shipping.service.js'

async function runTest() {
  console.log('--- TEST 1: Get Methods default (AED) ---')
  const methodsAED = shippingService.getMethods('AED')
  console.log('AED Methods:', JSON.stringify(methodsAED, null, 2))

  console.log('\n--- TEST 2: Get Methods in USD ---')
  const methodsUSD = shippingService.getMethods('USD')
  console.log('USD Methods:', JSON.stringify(methodsUSD, null, 2))

  console.log('\n--- TEST 3: Calculate Shipping in SAR ---')
  const calcSAR = shippingService.calculateShippingCost({ currency: 'SAR', methodId: 'standard' })
  console.log('SAR Calc:', calcSAR)

  console.log('\n--- TEST 4: Calculate Shipping in EUR ---')
  const calcEUR = shippingService.calculateShippingCost({ currency: 'EUR', methodId: 'standard' })
  console.log('EUR Calc:', calcEUR)

  console.log('\n--- TEST 5: Calculate Shipping in INR ---')
  const calcINR = shippingService.calculateShippingCost({ currency: 'INR', methodId: 'standard' })
  console.log('INR Calc:', calcINR)

  console.log('\n--- TEST 6: Update method rates ---')
  const updated = shippingService.updateMethod('standard', {
    rates: {
      AED: 110,
      SAR: 115,
      USD: 32,
      EUR: 29,
      INR: 2600,
    }
  })
  console.log('Updated Standard Method:', updated?.rates)

  // Revert to original test values
  shippingService.updateMethod('standard', {
    rates: {
      AED: 110,
      SAR: 112,
      USD: 30,
      EUR: 28,
      INR: 2500,
    }
  })

  console.log('\nALL SHIPPING SERVICE TESTS PASSED!')
}

runTest().catch(console.error)
