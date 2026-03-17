import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgentSession } from '@/lib/agentAuth'
import { buildAgentDocumentKey, createSignedPutUrlForKey, buildS3ObjectUrl } from '@/lib/s3'

export const runtime = 'nodejs'

const VALID_DOC_TYPES = [
  'GOVERNMENT_ID',
  'REAL_ESTATE_LICENSE',
  'SELFIE_VERIFICATION',
  'ADDRESS_PROOF',
  'AGENCY_CERTIFICATE',
] as const

const BodySchema = z.object({
  documentType: z.enum(VALID_DOC_TYPES),
  filename: z.string().trim().min(1).max(160),
  contentType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().min(1).max(15 * 1024 * 1024), // max 15MB
})

function safeFilename(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

function isAllowedDocType(mime: string) {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]
  return allowed.includes(mime.toLowerCase())
}

function getExtensionFromFilename(filename: string): string {
  const parts = filename.split('.')
  if (parts.length > 1) {
    return parts.pop() || 'bin'
  }
  return 'bin'
}

/**
 * POST /api/agent/documents/presign
 * 
 * Returns a presigned PUT URL for uploading agent verification documents to private S3 storage.
 * Files are stored in private/agents/{agentId}/documents/{documentType}/
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid request data', details: parsed.error.flatten() }, { status: 400 })
    }

    const { documentType, filename, contentType, sizeBytes } = parsed.data

    // Validate file type
    if (!isAllowedDocType(contentType)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Only JPG, PNG, WebP images and PDF files are allowed for documents.' 
      }, { status: 400 })
    }

    // Validate file size (15MB max)
    if (sizeBytes > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File size must be under 15MB.' }, { status: 400 })
    }

    const safeName = safeFilename(filename) || 'document'
    const ext = getExtensionFromFilename(filename)

    // Build S3 key for private agent document storage
    const key = buildAgentDocumentKey({
      agentId: auth.agentId,
      documentType,
      ext,
      contentType,
    })

    // Generate presigned PUT URL
    const signed = await createSignedPutUrlForKey({
      key,
      contentType,
      expiresInSeconds: 600, // 10 minutes
    })

    // Build the object URL for storage reference
    const objectUrl = buildS3ObjectUrl({ key })

    return NextResponse.json({
      success: true,
      uploadUrl: signed.uploadUrl,
      objectUrl,
      key,
      bucket: signed.bucket,
      region: signed.region,
      expiresIn: signed.expiresIn,
      documentType,
      contentType,
    })
  } catch (error) {
    console.error('Agent document presign error:', error)
    return NextResponse.json({ success: false, message: 'Failed to prepare upload' }, { status: 500 })
  }
}
