import { NextRequest, NextResponse } from 'next/server'
import { buildApiSuccessEnvelope, buildApiErrorEnvelope } from '@/lib/api-response'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const VALID_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 10

const VALID_DOC_TYPES = [
  'RERA_CERTIFICATE', 'GST_CERTIFICATE', 'PAN_CARD',
  'REGISTRATION_CERTIFICATE', 'AUTHORIZED_PERSON_ID', 'BROCHURE', 'OTHER',
]

/**
 * POST /api/developer/documents/presign
 * Returns a pre-signed S3 PUT URL for direct document upload from the browser.
 * The client uploads to S3 directly, then calls /api/developer/documents to save the record.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if ((session.user as any)?.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { documentType, fileName, mimeType } = body

  if (!VALID_DOC_TYPES.includes(documentType)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
  }

  if (!VALID_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP.` },
      { status: 400 }
    )
  }

  const ext = mimeType === 'application/pdf' ? 'pdf'
    : mimeType === 'image/jpeg' ? 'jpg'
    : mimeType === 'image/png' ? 'png'
    : 'webp'

  const s3Key = `developer-docs/${userId}/${documentType}/${randomUUID()}.${ext}`

  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: s3Key,
    ContentType: mimeType,
    ContentLength: undefined, // Client sets this
    Metadata: {
      'uploaded-by': userId,
      'document-type': documentType,
      'original-name': fileName || '',
    },
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }) // 5 min

  const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`

  return NextResponse.json(buildApiSuccessEnvelope({ uploadUrl, fileUrl, s3Key }, 'Upload ready'))
}
