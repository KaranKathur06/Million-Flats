export const LEAD_MAGNET_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

export type LeadMagnetMimeType = (typeof LEAD_MAGNET_ALLOWED_MIME_TYPES)[number]

export const LEAD_MAGNET_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export const LEAD_MAGNET_MIME_TYPE_EXTENSIONS: Record<
  LeadMagnetMimeType,
  readonly string[]
> = {
  'application/pdf': ['pdf'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
}

export function getLeadMagnetMimeTypeFromFileName(fileName: string): LeadMagnetMimeType | undefined {
  const extension = fileName.match(/\.([^.]+)$/)?.[1].toLowerCase()
  if (!extension) return undefined
  return LEAD_MAGNET_ALLOWED_MIME_TYPES.find((mimeType) =>
    LEAD_MAGNET_MIME_TYPE_EXTENSIONS[mimeType].includes(extension)
  )
}
