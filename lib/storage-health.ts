import { getGcsStorageConfig } from '@/lib/storage/storage.config'
import { getStorageProvider } from '@/lib/storage'

export function assertStorageConfiguration() {
  const config = getGcsStorageConfig()
  getStorageProvider()
  return config
}
