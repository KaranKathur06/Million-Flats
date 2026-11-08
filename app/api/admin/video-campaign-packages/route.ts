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

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const [packages, configuredTaxRateBps] = await Promise.all([
    prisma.videoCampaignPackage.findMany({ orderBy: [{ isActive: 'desc' }, { amount: 'asc' }] }),
    Promise.resolve(getConfiguredVideoCampaignTaxRateBps()),
  ])
  return NextResponse.json({ packages, configuredTaxRateBps }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
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
    const result = await prisma.$transaction(async (tx) => {
      const campaignPackage = await tx.videoCampaignPackage.create({ data: parsed.data })
      await writeVideoAudit(tx, {
        actorUserId: auth.userId,
        entityType: 'PACKAGE',
        entityId: campaignPackage.id,
        action: 'PACKAGE_CREATED',
        afterState: {
          slug: campaignPackage.slug,
          name: campaignPackage.name,
          durationDays: campaignPackage.durationDays,
          allocationBps: campaignPackage.allocationBps,
          amount: campaignPackage.amount,
          taxRateBps: campaignPackage.taxRateBps,
          version: campaignPackage.version,
          isActive: campaignPackage.isActive,
        },
      })
      return campaignPackage
    })
    return NextResponse.json({ package: result }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Video campaign package creation failed', error)
    return NextResponse.json({ error: 'Unable to create the campaign package' }, { status: 500 })
  }
}
