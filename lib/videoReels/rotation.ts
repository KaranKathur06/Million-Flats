import crypto from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getVideoCampaignSettings } from '@/lib/videoReels/config'
import { chooseCampaignForOpportunity, type RotationDeficits } from '@/lib/videoReels/policy'

export class RotationUnavailableError extends Error {
  constructor() {
    super('Sponsored rotation is unavailable')
    this.name = 'RotationUnavailableError'
  }
}

class ConcurrentRotationWriteError extends Error {}

function utcDayStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function parseDeficits(value: Prisma.JsonValue): RotationDeficits {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RotationUnavailableError()
  }
  const deficits: RotationDeficits = {}
  for (const [id, amount] of Object.entries(value)) {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) throw new RotationUnavailableError()
    deficits[id] = amount
  }
  return deficits
}

export async function assignSponsoredOpportunity(viewerHmacs: string[], now = new Date()) {
  const settings = await getVideoCampaignSettings()
  const day = utcDayStart(now)
  const frequencyStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.videoRotationState.upsert({
          where: { day },
          create: { day, opportunitySequence: 0, allocationDeficits: {} },
          update: {},
        })

        const state = await tx.videoRotationState.findUnique({ where: { day } })
        if (!state) throw new RotationUnavailableError()
        const sequence = state.opportunitySequence + 1
        const campaigns = await tx.videoCampaign.findMany({
          where: {
            status: { in: ['SCHEDULED', 'ACTIVE', 'PAUSED'] },
            approvedStartAt: { lte: now },
            approvedEndAt: { gt: now },
            order: { is: { status: 'CAPTURED' } },
            reel: { is: { moderationStatus: 'APPROVED', mediaVerifiedAt: { not: null }, mediaDeletedAt: null } },
          },
          include: { reel: { include: { project: { select: { slug: true } } } } },
          orderBy: [{ adminPriority: 'desc' }, { id: 'asc' }],
        })
        const campaignIds = campaigns.map((campaign) => campaign.id)
        const [dailyMetrics, lifetimeMetrics, frequencyCounts] = campaignIds.length
          ? await Promise.all([
            tx.videoCampaignDailyMetric.groupBy({
              by: ['campaignId'],
              where: { campaignId: { in: campaignIds }, date: day },
              _sum: { impressions: true },
            }),
            tx.videoCampaignDailyMetric.groupBy({
              by: ['campaignId'],
              where: { campaignId: { in: campaignIds } },
              _sum: { impressions: true },
            }),
            viewerHmacs.length
              ? tx.videoRotationAssignment.groupBy({
                by: ['campaignId'],
                where: {
                  campaignId: { in: campaignIds },
                  viewerHmac: { in: viewerHmacs },
                  createdAt: { gte: frequencyStart },
                },
                _count: { _all: true },
              })
              : Promise.resolve([]),
          ])
          : [[], [], []]

        const dailyCounts = new Map(dailyMetrics.map((row) => [row.campaignId, row._sum.impressions || 0]))
        const lifetimeCounts = new Map(lifetimeMetrics.map((row) => [row.campaignId, row._sum.impressions || 0]))
        const frequencyByCampaign = new Map(frequencyCounts.map((row) => [row.campaignId, row._count._all]))

        const scheduled = campaigns.map((campaign) => {
          const dailyCount = dailyCounts.get(campaign.id) || 0
          const lifetimeCount = lifetimeCounts.get(campaign.id) || 0
          const frequencyCount = frequencyByCampaign.get(campaign.id) || 0
          return {
            id: campaign.id,
            ownerUserId: campaign.ownerUserId,
            allocationBps: campaign.allocationBps,
            adminPriority: campaign.adminPriority,
            frequencyCap: campaign.frequencyCap,
            deliverable: campaign.status !== 'PAUSED'
              && (campaign.dailyImpressionCap === null || dailyCount < campaign.dailyImpressionCap)
              && (campaign.totalImpressionCap === null || lifetimeCount < campaign.totalImpressionCap)
              && frequencyCount < campaign.frequencyCap,
            campaign,
          }
        })

        const firstSequenceInBlock = Math.floor((sequence - 1) / 4) * 4 + 1
        const assignmentsInBlock = await tx.videoRotationAssignment.findMany({
          where: {
            day,
            sequence: { gte: firstSequenceInBlock, lt: sequence },
            advertiserUserId: { not: null },
          },
          select: { sequence: true, advertiserUserId: true },
        })
        const advertisersAlreadyServedInBlock = new Set(
          assignmentsInBlock.map((assignment) => `${Math.floor((assignment.sequence - 1) / 4)}:${assignment.advertiserUserId}`),
        )

        const chosen = chooseCampaignForOpportunity({
          campaigns: scheduled.map(({ campaign: _campaign, ...candidate }) => candidate),
          deficits: parseDeficits(state.allocationDeficits),
          maxAllocationBps: settings.maxAllocationBps,
          sequence,
          advertisersAlreadyServedInBlock,
        })
        const campaign = chosen.campaignId
          ? scheduled.find((candidate) => candidate.id === chosen.campaignId)?.campaign || null
          : null
        const tokenId = campaign ? crypto.randomUUID() : null

        const updated = await tx.videoRotationState.updateMany({
          where: { day, opportunitySequence: state.opportunitySequence },
          data: {
            opportunitySequence: sequence,
            allocationDeficits: chosen.deficits,
          },
        })
        if (updated.count !== 1) throw new ConcurrentRotationWriteError()

        await tx.videoRotationAssignment.create({
          data: {
            day,
            sequence,
            campaignId: campaign?.id || null,
            advertiserUserId: campaign?.ownerUserId || null,
            viewerHmac: campaign ? viewerHmacs[0] || null : null,
            deliveryTokenId: tokenId,
            createdAt: now,
          },
        })

        return { campaign, tokenId, sequence }
      }, { isolationLevel: 'Serializable' })
    } catch (error) {
      if (error instanceof ConcurrentRotationWriteError) continue
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue
      throw error
    }
  }

  throw new RotationUnavailableError()
}
