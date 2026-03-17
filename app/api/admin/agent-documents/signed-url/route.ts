import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { createSignedGetUrl, extractS3KeyFromUrl } from '@/lib/s3'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const BodySchema = z.object({
  documentId: z.string().trim().min(1).optional(),
  s3Key: z.string().trim().min(1).optional(),
  fileUrl: z.string().trim().min(1).optional(),
  expiresInSeconds: z.number().int().min(30).max(3600).optional(),
})

/**
 * POST /api/admin/agent-documents/signed-url
 * 
 * Returns a signed S3 URL for viewing private agent documents.
 * Admin-only endpoint. Accepts documentId, s3Key, or fileUrl.
 */
export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid request data' }, { status: 400 })
  }

  const { documentId, s3Key, fileUrl, expiresInSeconds } = parsed.data

  let finalKey: string | null = s3Key || null

  // If documentId provided, look up the document to get s3Key
  if (documentId && !finalKey) {
    const doc = await (prisma as any).agentDocument.findFirst({
      where: { id: documentId },
      select: { s3Key: true, fileUrl: true },
    })

    if (doc?.s3Key) {
      finalKey = doc.s3Key
    } else if (doc?.fileUrl) {
      // Try to extract key from fileUrl if s3Key not stored
      finalKey = extractS3KeyFromUrl(doc.fileUrl)
    }
  }

  // If fileUrl provided and no s3Key, try to extract from URL
  if (!finalKey && fileUrl) {
    finalKey = extractS3KeyFromUrl(fileUrl)
  }

  if (!finalKey) {
    return NextResponse.json({ success: false, message: 'Could not determine S3 key for document' }, { status: 400 })
  }

  // Ensure the key is for private storage (security check)
  if (!finalKey.startsWith('private/')) {
    // For public files, just return the URL directly
    return NextResponse.json({ 
      success: true, 
      url: fileUrl || `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalKey}`,
      isPublic: true,
    })
  }

  // Generate signed URL for private file
  try {
    const signed = await createSignedGetUrl({ 
      key: finalKey, 
      expiresInSeconds: expiresInSeconds || 300 // 5 minutes default
    })

    return NextResponse.json({ 
      success: true, 
      url: signed.url, 
      expiresIn: signed.expiresIn,
      isPublic: false,
    })
  } catch (error) {
    console.error('Failed to generate signed URL for agent document:', error)
    return NextResponse.json({ success: false, message: 'Failed to generate signed URL' }, { status: 500 })
  }
}
