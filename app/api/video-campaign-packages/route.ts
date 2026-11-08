import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isVideoReelsEnabled } from '@/lib/videoReels/config'

export async function GET() {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ packages: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const packages = await prisma.videoCampaignPackage.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      durationDays: true,
      allocationBps: true,
      amount: true,
      currency: true,
      dailyImpressionCap: true,
      totalImpressionCap: true,
      frequencyCap: true,
    },
    orderBy: { amount: 'asc' },
  })
  return NextResponse.json({ packages }, { headers: { 'Cache-Control': 'no-store' } })
}
