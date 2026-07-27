import { getS3StorageConfig, getS3Client } from '@/lib/s3'

export function assertStorageConfiguration() {
  const config = getS3StorageConfig()
  const missing: string[] = []

  if (!config.bucket) missing.push('AWS_S3_BUCKET')
  if (!config.region) missing.push('AWS_REGION')

  if (missing.length) {
    throw new Error(`Storage misconfiguration: missing ${missing.join(', ')}`)
  }

  try {
    getS3Client()
  } catch (error) {
    throw new Error(`Storage misconfiguration: ${(error as Error).message}`)
  }

  return config
}
