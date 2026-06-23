import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/developer/documents
 * Saves a document record after successful S3 upload.
 * Called by the verification page after the file has been PUT to S3.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if ((session.user as any)?.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = await (prisma as any).developerProfile.findUnique({
    where: { userId },
    select: { id: true, onboardingStatus: true },
  })
  if (!profile) return NextResponse.json({ error: 'Developer profile not found' }, { status: 404 })

  const body = await req.json()
  const { documentType, fileUrl, s3Key, fileName, mimeType, sizeBytes } = body

  const VALID_TYPES = [
    'RERA_CERTIFICATE', 'GST_CERTIFICATE', 'PAN_CARD',
    'REGISTRATION_CERTIFICATE', 'AUTHORIZED_PERSON_ID', 'BROCHURE', 'OTHER',
  ]

  if (!VALID_TYPES.includes(documentType)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
  }
  if (!fileUrl) return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })

  // Upsert — replace if same type already uploaded
  const existing = await (prisma as any).developerDocument.findFirst({
    where: { developerProfileId: profile.id, documentType },
    select: { id: true },
  })

  const document = existing
    ? await (prisma as any).developerDocument.update({
        where: { id: existing.id },
        data: {
          fileUrl,
          s3Key: s3Key || null,
          fileName: fileName || null,
          mimeType: mimeType || null,
          sizeBytes: sizeBytes ? parseInt(sizeBytes) : null,
          verificationStatus: 'PENDING',
          rejectionReason: null,
          uploadedAt: new Date(),
        },
      })
    : await (prisma as any).developerDocument.create({
        data: {
          developerProfileId: profile.id,
          documentType,
          fileUrl,
          s3Key: s3Key || null,
          fileName: fileName || null,
          mimeType: mimeType || null,
          sizeBytes: sizeBytes ? parseInt(sizeBytes) : null,
          verificationStatus: 'PENDING',
        },
      })

  // Advance onboarding status if still PROFILE_COMPLETED
  if (profile.onboardingStatus === 'PROFILE_COMPLETED') {
    await (prisma as any).developerProfile.update({
      where: { id: profile.id },
      data: { onboardingStatus: 'DOCUMENTS_UPLOADED' },
    })
  }

  return NextResponse.json({ document }, { status: existing ? 200 : 201 })
}

/**
 * GET /api/developer/documents
 * Returns all documents for the authenticated developer.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  if ((session.user as any)?.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = await (prisma as any).developerProfile.findUnique({
    where: { userId }, select: { id: true },
  })
  if (!profile) return NextResponse.json({ documents: [] })

  const documents = await (prisma as any).developerDocument.findMany({
    where: { developerProfileId: profile.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ documents })
}
