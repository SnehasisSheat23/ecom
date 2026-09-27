import { storageService } from '../lib/storage.js'

async function testSupabaseStorage() {
  console.log('Testing Supabase S3 Storage Upload to bucket: standcore...')
  const dummyBuffer = Buffer.from('test image content ' + Date.now())
  const publicUrl = await storageService.uploadFile('test-img.txt', dummyBuffer, 'text/plain')
  console.log('✅ Upload successful! Public URL:', publicUrl)

  // Verify fetch public URL
  const res = await fetch(publicUrl)
  console.log('Public URL HTTP status:', res.status)
  if (res.ok) {
    const text = await res.text()
    console.log('Fetched content successfully:', text)
  } else {
    console.warn('Note: If status is 400/404, make sure the "standcore" bucket is marked as "Public" in Supabase Storage UI.')
  }
}

testSupabaseStorage().catch(console.error)
