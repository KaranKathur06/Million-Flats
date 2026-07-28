import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgentProfileSession } from '@/lib/agentAuth'
import { createSignedGetUrl, extractS3KeyFromUrl } from '@/lib/s3'
import { prisma } from '@/lib/prisma'
import { buildApiErrorEnvelope, buildApiSuccessEnvelope } from '@/lib/api-response'

export const runtime = 'nodejs'

const BodySchema = z.object({
  documentId: z.string().trim().min(1).optional(),
  s3Key: z.string().trim().min(1).optional(),
  fileUrl: z.string().trim().min(1).optional(),
  expiresInSeconds: z.number().int().min(30).max(3600).optional(),
})

export async function POST(req: Request) {
  const auth = await requireAgentProfileSession()
  if (!auth.ok) {
    return NextResponse.json(buildApiErrorEnvelope(auth.message, 'UNAUTHORIZED'), { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(buildApiErrorEnvelope('Invalid request data', 'INVALID_REQUEST'), { status: 400 })
  }

  const { documentId, s3Key, fileUrl, expiresInSeconds } = parsed.data

  let finalKey = s3Key || null

  if (documentId && !finalKey) {
    const document = await (prisma as any).agentDocument.findFirst({
      where: { id: documentId, agentId: auth.agentId },
      select: { s3Key: true, fileUrl: true },
    })

    if (!document) {
      return NextResponse.json(buildApiErrorEnvelope('Document not found', 'NOT_FOUND'), { status: 404 })
    }

    finalKey = document.s3Key || null
    if (!finalKey && document.fileUrl) {
      finalKey = extractS3KeyFromUrl(document.fileUrl)
    }
  }

  if (!finalKey && fileUrl) {
    finalKey = extractS3KeyFromUrl(fileUrl)
  }

  if (!finalKey) {
    return NextResponse.json(buildApiErrorEnvelope('Could not determine S3 key for document', 'MISSING_KEY'), { status: 400 })
  }

  try {
    const signed = await createSignedGetUrl({ key: finalKey, expiresInSeconds: expiresInSeconds || 300 })
    return NextResponse.json(buildApiSuccessEnvelope({ url: signed.url, expiresIn: signed.expiresIn, key: finalKey }, 'Signed URL ready'))
  } catch (error) {
    console.error('Failed to generate signed URL for agent document:', error)
    return NextResponse.json(buildApiErrorEnvelope('Failed to generate signed URL', 'SIGNED_URL_FAILED'), { status: 500 })
  }
}
