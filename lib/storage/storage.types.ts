export type StorageVisibility = 'public' | 'private' | 'protected'

export type StorageUploadOptions = {
  key: string
  contentType: string
  cacheControl?: string
  metadata?: Record<string, string>
}

export type StorageMetadata = {
  sizeBytes: number
  contentType: string
  crc32c: string | null
  md5Hash: string | null
  etag: string | null
  metadata: Record<string, string>
}

export type SignedUrlResult = {
  url: string
  expiresInSeconds: number
}

export interface StorageProvider {
  uploadFile(filePath: string, options: StorageUploadOptions): Promise<void>
  uploadBuffer(buffer: Buffer, options: StorageUploadOptions): Promise<void>
  downloadFile(key: string, destination: string): Promise<void>
  getFileMetadata(key: string): Promise<StorageMetadata>
  deleteFile(key: string): Promise<void>
  deleteFiles(keys: string[]): Promise<void>
  deleteFolder(prefix: string): Promise<number>
  fileExists(key: string): Promise<boolean>
  getPublicUrl(key: string): string
  getSignedReadUrl(key: string, expiresInSeconds: number): Promise<SignedUrlResult>
  getSignedUploadUrl(key: string, expiresInSeconds: number, contentType: string, cacheControl?: string): Promise<SignedUrlResult>
  copyFile(sourceKey: string, destinationKey: string): Promise<void>
}
