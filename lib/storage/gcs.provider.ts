import { Storage } from '@google-cloud/storage'
import { getGcsStorageConfig, type GcsStorageConfig } from './storage.config'
import { isStorageNotFound, StorageError } from './storage.errors'
import type { SignedUrlResult, StorageMetadata, StorageProvider, StorageUploadOptions } from './storage.types'

function normalizeKey(key: string): string {
  const normalized = String(key || '').trim().replace(/^\/+/, '').replace(/\/+/g, '/')
  if (!normalized) throw new StorageError('Storage key is required', 'VALIDATION')
  if (normalized.includes('..') || normalized.startsWith('http://') || normalized.startsWith('https://')) {
    throw new StorageError('Invalid storage key', 'VALIDATION')
  }
  if (!/^((public|private|protected)\/).+/.test(normalized)) {
    throw new StorageError('Storage key must begin with public/, private/, or protected/', 'VALIDATION')
  }
  return normalized
}

export class GcsStorageProvider implements StorageProvider {
  private readonly storage: Storage
  private readonly config: GcsStorageConfig

  constructor(config = getGcsStorageConfig()) {
    this.config = config
    this.storage = new Storage({
      projectId: config.projectId,
      ...(config.keyFilename ? { keyFilename: config.keyFilename } : {}),
      ...(config.credentialsJson ? { credentials: config.credentialsJson as any } : {}),
    })
  }

  private file(key: string) {
    return this.storage.bucket(this.config.bucket).file(normalizeKey(key))
  }

  async uploadFile(filePath: string, options: StorageUploadOptions): Promise<void> {
    try {
      await this.storage.bucket(this.config.bucket).upload(filePath, {
        destination: normalizeKey(options.key),
        metadata: {
          contentType: options.contentType,
          cacheControl: options.cacheControl,
          metadata: options.metadata,
        },
      })
    } catch (error) {
      throw new StorageError('Failed to upload storage file', 'PROVIDER', error)
    }
  }

  async uploadBuffer(buffer: Buffer, options: StorageUploadOptions): Promise<void> {
    try {
      await this.file(options.key).save(buffer, {
        metadata: {
          contentType: options.contentType,
          cacheControl: options.cacheControl,
          metadata: options.metadata,
        },
        resumable: buffer.length > 5 * 1024 * 1024,
      })
    } catch (error) {
      throw new StorageError('Failed to upload storage buffer', 'PROVIDER', error)
    }
  }

  async downloadFile(key: string, destination: string): Promise<void> {
    try {
      await this.file(key).download({ destination })
    } catch (error) {
      if (isStorageNotFound(error)) throw new StorageError('Storage object not found', 'NOT_FOUND', error)
      throw new StorageError('Failed to download storage file', 'PROVIDER', error)
    }
  }

  async getFileMetadata(key: string): Promise<StorageMetadata> {
    try {
      const [metadata] = await this.file(key).getMetadata()
      return {
        sizeBytes: Number(metadata.size || 0),
        contentType: String(metadata.contentType || '').toLowerCase(),
        crc32c: typeof metadata.crc32c === 'string' ? metadata.crc32c : null,
        md5Hash: typeof metadata.md5Hash === 'string' ? metadata.md5Hash : null,
        etag: typeof metadata.etag === 'string' ? metadata.etag : null,
        metadata: metadata.metadata && typeof metadata.metadata === 'object'
          ? Object.fromEntries(Object.entries(metadata.metadata).map(([name, value]) => [name, String(value)]))
          : {},
      }
    } catch (error) {
      if (isStorageNotFound(error)) throw new StorageError('Storage object not found', 'NOT_FOUND', error)
      throw new StorageError('Failed to retrieve storage metadata', 'PROVIDER', error)
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.file(key).delete({ ignoreNotFound: true })
    } catch (error) {
      throw new StorageError('Failed to delete storage object', 'PROVIDER', error)
    }
  }

  async deleteFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.deleteFile(key)))
  }

  async deleteFolder(prefix: string): Promise<number> {
    const normalizedPrefix = normalizeKey(`${prefix.replace(/^\/+|\/+$/g, '')}/`)
    const [files] = await this.storage.bucket(this.config.bucket).getFiles({ prefix: normalizedPrefix })
    await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })))
    return files.length
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const [exists] = await this.file(key).exists()
      return exists
    } catch (error) {
      throw new StorageError('Failed to check storage object', 'PROVIDER', error)
    }
  }

  getPublicUrl(key: string): string {
    const normalized = normalizeKey(key)
    if (!normalized.startsWith('public/')) {
      throw new StorageError('Only public storage keys can use public URLs', 'VALIDATION')
    }
    return `https://storage.googleapis.com/${encodeURIComponent(this.config.bucket)}/${encodeURIComponent(normalized).replace(/%2F/g, '/')}`
  }

  async getSignedReadUrl(key: string, expiresInSeconds: number): Promise<SignedUrlResult> {
    const normalized = normalizeKey(key)
    const ttl = Math.min(3600, Math.max(30, Math.floor(expiresInSeconds)))
    try {
      const [url] = await this.file(normalized).getSignedUrl({
        action: 'read',
        expires: Date.now() + ttl * 1000,
        responseDisposition: 'inline',
      })
      return { url, expiresInSeconds: ttl }
    } catch (error) {
      throw new StorageError('Failed to generate signed read URL', 'PERMISSION', error)
    }
  }

  async getSignedUploadUrl(key: string, expiresInSeconds: number, contentType: string, cacheControl?: string): Promise<SignedUrlResult> {
    const normalized = normalizeKey(key)
    const ttl = Math.min(600, Math.max(30, Math.floor(expiresInSeconds)))
    try {
      const [url] = await this.file(normalized).getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + ttl * 1000,
        contentType,
        ...(cacheControl ? { responseCacheControl: cacheControl } : {}),
      })
      return { url, expiresInSeconds: ttl }
    } catch (error) {
      throw new StorageError('Failed to generate signed upload URL', 'PERMISSION', error)
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.file(sourceKey).copy(this.storage.bucket(this.config.bucket).file(normalizeKey(destinationKey)))
    } catch (error) {
      throw new StorageError('Failed to copy storage object', 'PROVIDER', error)
    }
  }
}
