import { prisma } from '@/lib/prisma'
import { deleteFolderFromS3, deleteFromS3 } from '@/lib/s3'

const LEASE_MS = 5 * 60 * 1000
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000

export async function processStorageCleanupJobs(limit = 50, jobIds?: string[]) {
  const now = new Date()
  const eligible = {
    OR: [
      { status: 'PENDING', availableAt: { lte: now } },
      { status: 'PROCESSING', lockedUntil: { lte: now } },
    ],
  }
  const where = jobIds?.length ? { AND: [eligible, { id: { in: jobIds } }] } : eligible
  const jobs = await (prisma as any).storageCleanupJob.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: Math.max(1, Math.min(limit, 100)),
  })

  const completed: string[] = []
  const pending: string[] = []

  for (const job of jobs) {
    const claimed = await (prisma as any).storageCleanupJob.updateMany({
      where: {
        id: job.id,
        OR: [
          { status: 'PENDING', availableAt: { lte: now } },
          { status: 'PROCESSING', lockedUntil: { lte: now } },
        ],
      },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        lockedUntil: new Date(Date.now() + LEASE_MS),
      },
    })
    if (!claimed.count) continue

    const attempts = Number(job.attempts || 0) + 1
    const items = Array.isArray(job.storageItems)
      ? job.storageItems.filter((item: unknown) => {
          if (typeof item === 'string') return item.trim().length > 0
          if (!item || typeof item !== 'object') return false
          const value = item as Record<string, unknown>
          return (value.type === 'key' && typeof value.key === 'string' && value.key.trim().length > 0)
            || (value.type === 'folder' && typeof value.prefix === 'string' && value.prefix.trim().length > 0)
        })
      : []

    try {
      await Promise.all(items.map((item: unknown) => {
        if (typeof item === 'string') return deleteFromS3(item)
        const value = item as Record<string, string>
        return value.type === 'folder' ? deleteFolderFromS3(value.prefix) : deleteFromS3(value.key)
      }))
      await (prisma as any).storageCleanupJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date(), lockedUntil: null, lastError: null },
      })
      completed.push(job.id)
    } catch (error) {
      const retryDelay = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), MAX_RETRY_DELAY_MS)
      await (prisma as any).storageCleanupJob.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          availableAt: new Date(Date.now() + retryDelay),
          lockedUntil: null,
          lastError: String(error).slice(0, 4000),
        },
      })
      pending.push(job.id)
    }
  }

  return { processed: completed.length + pending.length, completed, pending }
}