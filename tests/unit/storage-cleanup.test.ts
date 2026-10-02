jest.mock('@/lib/prisma', () => ({
  prisma: { storageCleanupJob: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() } },
}))
jest.mock('@/lib/s3', () => ({ deleteFromS3: jest.fn() }))

import { prisma } from '@/lib/prisma'
import { deleteFromS3 } from '@/lib/s3'
import { processStorageCleanupJobs } from '@/lib/storageCleanup'

const cleanupJobs = (prisma as any).storageCleanupJob
const mockedDeleteFromS3 = deleteFromS3 as jest.MockedFunction<typeof deleteFromS3>

describe('durable storage cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cleanupJobs.findMany.mockResolvedValue([{ id: 'job-1', attempts: 0, storageItems: ['media/one.jpg'] }])
    cleanupJobs.updateMany.mockResolvedValue({ count: 1 })
    cleanupJobs.update.mockResolvedValue({})
  })

  it('completes a claimed job after deleting its S3 objects', async () => {
    const result = await processStorageCleanupJobs(1)

    expect(mockedDeleteFromS3).toHaveBeenCalledWith('media/one.jpg')
    expect(cleanupJobs.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'job-1' },
      data: expect.objectContaining({ status: 'COMPLETED', lockedUntil: null }),
    }))
    expect(result).toEqual({ processed: 1, completed: ['job-1'], pending: [] })
  })

  it('records a retry with backoff when S3 cleanup fails', async () => {
    mockedDeleteFromS3.mockRejectedValue(new Error('S3 unavailable'))

    const result = await processStorageCleanupJobs(1)

    expect(cleanupJobs.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'job-1' },
      data: expect.objectContaining({ status: 'PENDING', lockedUntil: null, lastError: 'Error: S3 unavailable' }),
    }))
    expect(result.pending).toEqual(['job-1'])
  })

  it('does not process a job another worker already claimed', async () => {
    cleanupJobs.updateMany.mockResolvedValue({ count: 0 })

    const result = await processStorageCleanupJobs(1)

    expect(mockedDeleteFromS3).not.toHaveBeenCalled()
    expect(result).toEqual({ processed: 0, completed: [], pending: [] })
  })
})