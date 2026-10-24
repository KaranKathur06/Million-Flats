import { UploadServiceError } from '@/services/uploadService'
import {
  LEAD_MAGNET_ALLOWED_MIME_TYPES,
  LEAD_MAGNET_MAX_FILE_SIZE_BYTES,
  LEAD_MAGNET_MIME_TYPE_EXTENSIONS,
  type LeadMagnetMimeType,
} from './fileTypes'

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function startsWithBytes(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte)
}

function detectLeadMagnetMimeType(bytes: Uint8Array): LeadMagnetMimeType | null {
  if (startsWithBytes(bytes, PNG_SIGNATURE)) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  const pdfHeaderIndex = bytes.findIndex((byte, index) =>
    index <= 1024 - PDF_SIGNATURE.length && startsWithBytes(bytes.subarray(index), PDF_SIGNATURE)
  )
  return pdfHeaderIndex >= 0 ? 'application/pdf' : null
}

export async function validateLeadMagnetFile(file: File): Promise<File> {
  if (file.size > LEAD_MAGNET_MAX_FILE_SIZE_BYTES) {
    throw new UploadServiceError('File too large (max 10MB)', 400)
  }

  const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  const detectedMimeType = detectLeadMagnetMimeType(bytes)
  if (!detectedMimeType) {
    throw new UploadServiceError('File content is not a supported PDF, PNG, JPG/JPEG, or WebP image.', 400)
  }

  const declaredMimeType = String(file.type || '').trim().toLowerCase()
  if (
    (declaredMimeType && !LEAD_MAGNET_ALLOWED_MIME_TYPES.some((mimeType) => mimeType === declaredMimeType)) ||
    (declaredMimeType && declaredMimeType !== detectedMimeType)
  ) {
    throw new UploadServiceError('File type does not match its content. Use a PDF, PNG, JPG/JPEG, or WebP file.', 400)
  }

  const extensionMatch = file.name.match(/\.([^.]+)$/)
  const fileNameExtension = extensionMatch?.[1].toLowerCase()
  const allowedExtensions = LEAD_MAGNET_MIME_TYPE_EXTENSIONS[detectedMimeType]
  if (fileNameExtension && !allowedExtensions.includes(fileNameExtension)) {
    throw new UploadServiceError('File extension does not match its content type.', 400)
  }

  const fileName = extensionMatch
    ? file.name
    : `${file.name.replace(/\.+$/, '') || 'lead-magnet'}.${allowedExtensions[0]}`
  if (declaredMimeType === detectedMimeType && fileName === file.name) return file
  return new File([file], fileName, { type: detectedMimeType, lastModified: file.lastModified })
}
