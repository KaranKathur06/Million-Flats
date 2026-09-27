import { NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '@/lib/prisma'
import { getS3Client } from '@/lib/s3'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { slug: string; floorPlanId: string } }) {
  const project = await (prisma as any).project.findFirst({
    where: { slug: params.slug, status: 'PUBLISHED', isDeleted: false },
    select: {
      floorPlans: {
        where: { id: params.floorPlanId },
        select: { s3Key: true, fileName: true, mimeType: true },
        take: 1,
      },
    },
  })
  const floorPlan = project?.floorPlans?.[0]
  if (!floorPlan?.s3Key) {
    return NextResponse.json({ success: false, message: 'Floor plan not found' }, { status: 404 })
  }

  const safeName = String(floorPlan.fileName || 'floor-plan.pdf').replace(/[\r\n"\\]/g, '_')
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: floorPlan.s3Key,
    ResponseContentType: floorPlan.mimeType || 'application/octet-stream',
    ResponseContentDisposition: `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
  })
  const downloadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 60 })
  return NextResponse.redirect(downloadUrl, { status: 302 })
}