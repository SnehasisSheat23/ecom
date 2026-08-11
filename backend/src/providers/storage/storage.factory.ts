import { getOptionalEnv } from '../../lib/env.js'
import { S3StorageProvider } from './s3.provider.js'
import { R2StorageProvider } from './r2.provider.js'
import type { StorageProvider } from './storage.interface.js'

export type StorageProviderName = 's3' | 'r2' | 'noop'

let storageProviderSingleton: StorageProvider | undefined

const resolveStorageProviderName = (hasR2Binding: boolean): StorageProviderName => {
  const envProvider = getOptionalEnv('STORAGE_PROVIDER') as StorageProviderName | undefined
  if (envProvider) return envProvider
  
  if (hasR2Binding) return 'r2'
  return 's3'
}

export const createStorageProviderFromEnv = (env?: { ASSETS_BUCKET?: R2Bucket }): StorageProvider | undefined => {
  const provider = resolveStorageProviderName(!!env?.ASSETS_BUCKET)

  if (provider === 'noop') {
    return undefined
  }

  if (provider === 'r2' && env?.ASSETS_BUCKET) {
    return new R2StorageProvider({
      bucket: env.ASSETS_BUCKET,
      publicDomain: (env as any).R2_PUBLIC_DOMAIN || getOptionalEnv('R2_PUBLIC_DOMAIN'),
    })
  }

  // Fallback to S3 if requested or if R2 binding is missing
  const hasS3Config = getOptionalEnv('S3_BUCKET') || getOptionalEnv('AWS_S3_BUCKET')
  
  if (!hasS3Config) {
    return undefined
  }

  return S3StorageProvider.fromEnv()
}

export const getStorageProvider = (env?: { ASSETS_BUCKET?: R2Bucket }): StorageProvider | undefined => {
  if (storageProviderSingleton) {
    return storageProviderSingleton
  }

  storageProviderSingleton = createStorageProviderFromEnv(env)
  return storageProviderSingleton
}
