import { prisma } from '@/lib/prisma'
import { deleteFromS3 } from '@/lib/s3'

const TERMINAL_CAMPAIGN_STATUSES = ['COMPLETED', 'REJECTED', 'CANCELLED'] as const

function subtractDays(value: Date, days: number) {
  return new Date(value.getTime() - days * 24 * 60 * 60 * 1000)
}

function subtractMonths(value: Date, months: number) {
  const result = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
  result.setUTCMonth(result.getUTCMonth() - months)
  return result
}

async function removeExpiredReelMedia(limit: number, now: Date) {
  const cutoff = subtractDays(now, 30)
  const candidates = await prisma.videoReel.findMany({
    where: {
      mediaDeletedAt: null,
      OR: [
        { moderationStatus: 'DRAFT', updatedAt: { lte: cutoff } },
        { moderationStatus: 'REJECTED', reviewedAt: { lte: cutoff } },
        { moderationStatus: 'ARCHIVED', archivedAt: { lte: cutoff } },
      ],
      campaigns: { none: { status: { notIn: [...TERMINAL_CAMPAIGN_STATUSES] } } },
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
    select: {
      id: true,
      mediaObjectKey: true,
      posterObjectKey: true,
      moderationStatus: true,
    },
  })

  let removed = 0
  let failed = 0
  for (const reel of candidates) {
    const claimed = await prisma.videoReel.updateMany({
      where: { id: reel.id, mediaDeletedAt: null, moderationStatus: reel.moderationStatus },
      data: { mediaDeletedAt: now },
    })
    if (claimed.count !== 1) continue

    try {
      await deleteFromS3(reel.mediaObjectKey)
      if (reel.posterObjectKey) await deleteFromS3(reel.posterObjectKey)

      if (reel.moderationStatus === 'DRAFT') {
        await prisma.videoReel.deleteMany({
          where: { id: reel.id, mediaDeletedAt: now, moderationStatus: 'DRAFT' },
        })
      } else {
        await prisma.videoReel.updateMany({
          where: { id: reel.id, mediaDeletedAt: now },
          data: { posterObjectKey: null },
        })
      }
      removed += 1
    } catch (error) {
      failed += 1
      console.error(`Expired video reel media cleanup failed for ${reel.id}`, error)
      await prisma.videoReel.updateMany({
        where: { id: reel.id, mediaDeletedAt: now },
        data: { mediaDeletedAt: null },
      })
    }
  }

  const posterRetries = await prisma.videoReel.findMany({
    where: { mediaDeletedAt: { not: null }, posterObjectKey: { not: null } },
    orderBy: { mediaDeletedAt: 'asc' },
    take: Math.max(0, limit - candidates.length),
    select: { id: true, posterObjectKey: true, moderationStatus: true },
  })
  for (const reel of posterRetries) {
    if (!reel.posterObjectKey) continue
    try {
      await deleteFromS3(reel.posterObjectKey)
      await prisma.videoReel.updateMany({
        where: { id: reel.id, posterObjectKey: reel.posterObjectKey },
        data: { posterObjectKey: null },
      })
      if (reel.moderationStatus === 'DRAFT') {
        await prisma.videoReel.deleteMany({
          where: { id: reel.id, mediaDeletedAt: { not: null }, moderationStatus: 'DRAFT' },
        })
      }
      removed += 1
    } catch (error) {
      failed += 1
      console.error(`Expired video reel poster cleanup failed for ${reel.id}`, error)
    }
  }

  return { removed, failed }
}

export async function processVideoReelMaintenance(limit = 50, now = new Date()) {
  const boundedLimit = Math.max(1, Math.min(100, Math.trunc(limit)))
  const media = await removeExpiredReelMedia(boundedLimit, now)
  const eventCutoff = subtractDays(now, 90)
  const metricCutoff = subtractMonths(now, 24)
  const assignmentCutoff = subtractDays(now, 30)
  const retentionBatchSize = boundedLimit * 100

  const [oldEvents, oldMetrics, oldAssignments, oldStates] = await Promise.all([
    prisma.videoCampaignEvent.findMany({ where: { createdAt: { lt: eventCutoff } }, select: { id: true }, take: retentionBatchSize }),
    prisma.videoCampaignDailyMetric.findMany({ where: { date: { lt: metricCutoff } }, select: { id: true }, take: retentionBatchSize }),
    prisma.videoRotationAssignment.findMany({ where: { createdAt: { lt: assignmentCutoff } }, select: { id: true }, take: retentionBatchSize }),
    prisma.videoRotationState.findMany({ where: { day: { lt: assignmentCutoff } }, select: { day: true }, take: retentionBatchSize }),
  ])
  const [events, metrics, assignments, rotationStates] = await Promise.all([
    oldEvents.length ? prisma.videoCampaignEvent.deleteMany({ where: { id: { in: oldEvents.map((row) => row.id) } } }) : { count: 0 },
    oldMetrics.length ? prisma.videoCampaignDailyMetric.deleteMany({ where: { id: { in: oldMetrics.map((row) => row.id) } } }) : { count: 0 },
    oldAssignments.length ? prisma.videoRotationAssignment.deleteMany({ where: { id: { in: oldAssignments.map((row) => row.id) } } }) : { count: 0 },
    oldStates.length ? prisma.videoRotationState.deleteMany({ where: { day: { in: oldStates.map((row) => row.day) } } }) : { count: 0 },
  ])

  return {
    expiredReelMediaRemoved: media.removed,
    expiredReelMediaFailures: media.failed,
    detailedEventsDeleted: events.count,
    dailyMetricsDeleted: metrics.count,
    rotationAssignmentsDeleted: assignments.count,
    rotationStatesDeleted: rotationStates.count,
  }
}
