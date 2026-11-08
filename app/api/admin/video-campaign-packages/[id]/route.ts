import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { getConfiguredVideoCampaignTaxRateBps, getVideoCampaignSettings } from '@/lib/videoReels/config'
import { writeVideoAudit } from '@/lib/videoReels/audit'

const PackageSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(120),
  durationDays: z.number().int().min(1).max(365),
  allocationBps: z.number().int().min(1).max(10_000),
  amount: z.number().int().min(1).max(100_000_000),
  taxRateBps: z.number().int().min(0).max(10_000),
  dailyImpressionCap: z.number().int().positive().nullable(),
  totalImpressionCap: z.number().int().positive().nullable(),
  frequencyCap: z.number().int().min(1).max(100),
  isActive: z.boolean(),
}).strict()

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const parsed = PackageSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid campaign package' }, { status: 400 })
  const configuredTaxRateBps = getConfiguredVideoCampaignTaxRateBps()
  if (configuredTaxRateBps === null) return NextResponse.json({ error: 'Finance tax configuration is unavailable' }, { status: 503 })
  if (parsed.data.taxRateBps !== configuredTaxRateBps) {
    return NextResponse.json({ error: 'Package tax rate must match finance configuration' }, { status: 400 })
  }

  const settings = await getVideoCampaignSettings()
  if (parsed.data.allocationBps > settings.maxAllocationBps) {
    return NextResponse.json({ error: 'Package allocation exceeds the configured maximum' }, { status: 400 })
  }

  try {
    const campaignPackage = await prisma.$transaction(async (tx) => {
      const before = await tx.videoCampaignPackage.findUnique({ where: { id: params.id } })
      if (!before) throw new Error('PACKAGE_NOT_FOUND')
      const after = await tx.videoCampaignPackage.update({
        where: { id: before.id },
        data: { ...parsed.data, version: { increment: 1 } },
      })
      await writeVideoAudit(tx, {
        actorUserId: auth.userId,
        entityType: 'PACKAGE',
        entityId: after.id,
        action: 'PACKAGE_UPDATED',
        beforeState: {
          slug: before.slug,
          name: before.name,
          durationDays: before.durationDays,
          allocationBps: before.allocationBps,
          amount: before.amount,
          taxRateBps: before.taxRateBps,
          version: before.version,
          isActive: before.isActive,
        },
        afterState: {
          slug: after.slug,
          name: after.name,
          durationDays: after.durationDays,
          allocationBps: after.allocationBps,
          amount: after.amount,
          taxRateBps: after.taxRateBps,
          version: after.version,
          isActive: after.isActive,
        },
      })
      return after
    })
    return NextResponse.json({ package: campaignPackage }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'PACKAGE_NOT_FOUND') {
      return NextResponse.json({ error: 'Campaign package not found' }, { status: 404 })
    }
    console.error('Video campaign package update failed', error)
    return NextResponse.json({ error: 'Unable to update the campaign package' }, { status: 500 })
  }
}
