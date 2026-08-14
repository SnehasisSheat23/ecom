async function testSaveMoqAndImage() {
  console.log('Testing MOQ and Image persistence in backend-v2...')

  try {
    const listRes = await fetch('http://localhost:8787/api/v1/products?limit=1')
    const listData = await listRes.json()
    const product = listData.data.items[0]

    const testImg = 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/extra-virgin-olive-oil.jpg'

    const updateRes = await fetch(`http://localhost:8787/api/v1/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moq: 5,
        moqStep: 5,
        images: [testImg],
      }),
    })

    const updateData = await updateRes.json()
    console.log('Update Result:', updateData.success, {
      moq: updateData.data.moq,
      moqStep: updateData.data.moqStep,
      images: updateData.data.images,
    })

    const fetchRes = await fetch(`http://localhost:8787/api/v1/products/${product.id}`)
    const fetchData = await fetchRes.json()
    console.log('Persisted Data:', {
      moq: fetchData.data.moq,
      moqStep: fetchData.data.moqStep,
      images: fetchData.data.images,
    })

    if (fetchData.data.moq === 5 && fetchData.data.moqStep === 5 && fetchData.data.images.includes(testImg)) {
      console.log('✅ MOQ AND IMAGE PERSISTENCE VERIFIED!')
    } else {
      console.error('❌ Persistence mismatch:', fetchData.data)
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

testSaveMoqAndImage()
