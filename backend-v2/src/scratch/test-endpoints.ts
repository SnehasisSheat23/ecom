async function testEndpoints() {
  console.log('Testing active backend-v2 endpoints on port 8787...')

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:8787/health')
    console.log('Health status:', healthRes.status, await healthRes.json())

    // 2. Media upload endpoint
    const mediaRes = await fetch('http://localhost:8787/api/v1/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/olive-oil.jpg' }),
    })
    console.log('Media POST status:', mediaRes.status, await mediaRes.json())

    // 3. Products GET
    const prodRes = await fetch('http://localhost:8787/api/v1/products?limit=1')
    console.log('Products GET status:', prodRes.status, await prodRes.json())
  } catch (err) {
    console.error('Fetch error:', err)
  }
}

testEndpoints()
