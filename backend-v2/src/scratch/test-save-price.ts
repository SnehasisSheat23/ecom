async function testSavePrice() {
  console.log('Testing price save in backend-v2...')

  try {
    // 1. Get first product
    const listRes = await fetch('http://localhost:8787/api/v1/products?limit=1')
    const listData = await listRes.json()
    const product = listData.data.items[0]
    console.log('Original Product:', { id: product.id, title: product.title, price: product.price, currency: product.currency })

    // 2. Update price to 149.99
    const newPrice = 149.99
    const newCompare = 199.99

    const updateRes = await fetch(`http://localhost:8787/api/v1/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: product.title,
        price: newPrice,
        compareAtPrice: newCompare,
        currency: 'SAR',
      }),
    })

    const updateData = await updateRes.json()
    console.log('Update Response:', updateData.success, {
      id: updateData.data.id,
      price: updateData.data.price,
      compareAtPrice: updateData.data.compareAtPrice,
      currency: updateData.data.currency,
      rawPricing: updateData.data.rawPricing,
    })

    // 3. Fetch product again to verify persistence
    const fetchRes = await fetch(`http://localhost:8787/api/v1/products/${product.id}?currency=SAR`)
    const fetchData = await fetchRes.json()
    console.log('Persisted Product:', {
      price: fetchData.data.price,
      compareAtPrice: fetchData.data.compareAtPrice,
      currency: fetchData.data.currency,
    })

    if (fetchData.data.price === newPrice) {
      console.log('✅ PRICE SAVE VERIFIED SUCCESSFUL!')
    } else {
      console.error('❌ Price mismatch:', fetchData.data.price, 'expected:', newPrice)
    }
  } catch (err) {
    console.error('Test error:', err)
  }
}

testSavePrice()
