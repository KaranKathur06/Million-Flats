import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSignedGetUrl } from '@/lib/s3'

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

  const signed = await createSignedGetUrl({ key: floorPlan.s3Key, expiresInSeconds: 60 })
  return NextResponse.redirect(signed.url, { status: 302 })
}