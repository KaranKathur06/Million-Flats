import { GcsStorageProvider } from './gcs.provider'
import type { StorageProvider } from './storage.types'

let cachedProvider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (!cachedProvider) cachedProvider = new GcsStorageProvider()
  return cachedProvider
}

export * from './storage.types'
export * from './storage.errors'
export { GcsStorageProvider } from './gcs.provider'
