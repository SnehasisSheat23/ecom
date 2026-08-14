async function testCurrencySwitching() {
  console.log('🧪 Testing multi-currency persistence & switching...')

  try {
    // 1. Get first product
    const listRes = await fetch('http://localhost:8787/api/v1/products?limit=1')
    const listData: any = await listRes.json()
    const product = listData.data.items[0]
    console.log('Initial Product:', { id: product.id, title: product.title, price: product.price, currency: product.currency })

    // 2. Save new prices for SAR (125.50) and USD (34.00)
    const updateRes = await fetch(`http://localhost:8787/api/v1/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: product.title,
        price: 125.50,
        currency: 'SAR',
        pricing: {
          SAR: { price: 125.50, compare_at: 150.00 },
          USD: { price: 34.00, compare_at: 40.00 },
          AED: { price: 125.50, compare_at: 150.00 },
          EUR: { price: 31.50, compare_at: 38.00 },
          GBP: { price: 27.00, compare_at: 32.00 },
          INR: { price: 2800.00, compare_at: 3200.00 },
        },
      }),
    })

    const updateData: any = await updateRes.json()
    console.log('Update result success:', updateData.success)
    console.log('Returned price/curr:', { price: updateData.data.price, currency: updateData.data.currency })
    console.log('Returned rawPricing:', updateData.data.rawPricing)

    // 3. Verify USD fetch
    const usdRes = await fetch(`http://localhost:8787/api/v1/products/${product.id}?currency=USD`)
    const usdData: any = await usdRes.json()
    console.log('Fetched USD product:', { price: usdData.data.price, currency: usdData.data.currency, compareAtPrice: usdData.data.compareAtPrice })

    // 4. Verify SAR fetch
    const sarRes = await fetch(`http://localhost:8787/api/v1/products/${product.id}?currency=SAR`)
    const sarData: any = await sarRes.json()
    console.log('Fetched SAR product:', { price: sarData.data.price, currency: sarData.data.currency, compareAtPrice: sarData.data.compareAtPrice })

    // 5. Check assertions
    if (usdData.data.price === 34 && sarData.data.price === 125.5) {
      console.log('✅ ALL MULTI-CURRENCY CHECKS PASSED!')
    } else {
      console.error('❌ Mismatch in currency prices!')
    }
  } catch (err) {
    console.error('Test error:', err)
  }
}

testCurrencySwitching()
