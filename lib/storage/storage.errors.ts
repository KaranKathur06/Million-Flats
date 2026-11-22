export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONFIGURATION' | 'NOT_FOUND' | 'PERMISSION' | 'NETWORK' | 'VALIDATION' | 'PROVIDER',
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export function isStorageNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: number | string; status?: number; statusCode?: number }
  return candidate.code === 404
    || candidate.code === '404'
    || candidate.status === 404
    || candidate.statusCode === 404
}
