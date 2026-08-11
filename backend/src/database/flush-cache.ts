import { getCacheProvider } from '../providers/cache/cache.factory.js'

async function run() {
  const cache = getCacheProvider()
  console.log('🧹 Flushing Redis cache...')
  try {
    // UpstashRedisCacheProvider has a private request method, but we can call it dynamically:
    if ('request' in cache && typeof (cache as any).request === 'function') {
      await (cache as any).request(['FLUSHDB'])
      console.log('✅ Redis Cache flushed successfully!')
    } else {
      console.warn('⚠️ Cache provider does not support direct flushing.')
    }
  } catch (error) {
    console.error('❌ Failed to flush cache:', error)
  }
}

run().then(() => process.exit(0))
