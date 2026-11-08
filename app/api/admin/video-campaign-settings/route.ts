import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { DEFAULT_VIDEO_CAMPAIGN_SETTINGS } from '@/lib/videoReels/config'
import { writeVideoAudit } from '@/lib/videoReels/audit'

const SettingsSchema = z.object({
  minFeedCardInterval: z.number().int().min(4).max(24),
  maxAllocationBps: z.number().int().min(1).max(10_000),
  defaultFrequencyCap: z.number().int().min(1).max(100),
  schedulingHorizonDays: z.number().int().min(1).max(365),
  defaultDailyImpressionCap: z.number().int().positive().nullable(),
  defaultTotalImpressionCap: z.number().int().positive().nullable(),
}).strict()

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const settings = await prisma.videoCampaignSettings.findUnique({ where: { id: 'global' } })
  return NextResponse.json({ settings: settings || DEFAULT_VIDEO_CAMPAIGN_SETTINGS }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const parsed = SettingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid rotation settings' }, { status: 400 })

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.videoCampaignSettings.findUnique({ where: { id: 'global' } })
      const activePackages = await tx.videoCampaignPackage.findMany({
        where: { isActive: true, allocationBps: { gt: parsed.data.maxAllocationBps } },
        select: { id: true },
      })
      const scheduledCampaigns = await tx.videoCampaign.findMany({
        where: {
          status: { in: ['APPROVED_AWAITING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'PAUSED'] },
          approvedStartAt: { not: null },
          approvedEndAt: { not: null },
          allocationBps: { gt: parsed.data.maxAllocationBps },
        },
        select: { id: true },
      })
      if (activePackages.length || scheduledCampaigns.length) {
        throw new Error('EXISTING_ALLOCATION_EXCEEDS_SETTINGS')
      }

      const after = await tx.videoCampaignSettings.upsert({
        where: { id: 'global' },
        create: { id: 'global', ...parsed.data, updatedByUserId: auth.userId },
        update: { ...parsed.data, updatedByUserId: auth.userId },
      })
      await writeVideoAudit(tx, {
        actorUserId: auth.userId,
        entityType: 'SETTINGS',
        entityId: 'global',
        action: 'SETTINGS_UPDATED',
        beforeState: before
          ? {
            minFeedCardInterval: before.minFeedCardInterval,
            maxAllocationBps: before.maxAllocationBps,
            defaultFrequencyCap: before.defaultFrequencyCap,
            schedulingHorizonDays: before.schedulingHorizonDays,
          }
          : undefined,
        afterState: {
          minFeedCardInterval: after.minFeedCardInterval,
          maxAllocationBps: after.maxAllocationBps,
          defaultFrequencyCap: after.defaultFrequencyCap,
          schedulingHorizonDays: after.schedulingHorizonDays,
        },
      })
      return after
    }, { isolationLevel: 'Serializable' })
    return NextResponse.json({ settings: updated }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'EXISTING_ALLOCATION_EXCEEDS_SETTINGS') {
      return NextResponse.json({ error: 'Active campaign allocations exceed this maximum' }, { status: 409 })
    }
    console.error('Video campaign settings update failed', error)
    return NextResponse.json({ error: 'Unable to update rotation settings' }, { status: 500 })
  }
}
