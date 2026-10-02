jest.mock('@/lib/prisma', () => ({ prisma: { $transaction: jest.fn() } }))
jest.mock('@/lib/manualPropertyAdminLifecycle', () => ({ revalidateManualPropertyPaths: jest.fn() }))

import { prisma } from '@/lib/prisma'
import { deleteManualPropertyDraft } from '@/lib/manualPropertyDraftDeletion'

const transaction = prisma as any
const property = {
  id: 'property-1',
  title: 'Draft home',
  intent: 'SALE',
  status: 'DRAFT',
  media: [{ s3Key: 'manual/property-1/cover.jpg' }],
}

function createTransactionClient() {
  return {
    manualProperty: { findFirst: jest.fn(), delete: jest.fn() },
    manualPropertyMedia: { deleteMany: jest.fn() },
    manualPropertyModerationLog: { deleteMany: jest.fn() },
    manualDuplicateOverrideLog: { deleteMany: jest.fn() },
    inquiry: { deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
    storageCleanupJob: { create: jest.fn() },
  }
}

describe('manual property draft permanent deletion', () => {
  let tx: ReturnType<typeof createTransactionClient>

  beforeEach(() => {
    jest.clearAllMocks()
    tx = createTransactionClient()
    tx.manualProperty.findFirst.mockResolvedValue(property)
    tx.storageCleanupJob.create.mockResolvedValue({ id: 'cleanup-1' })
    tx.auditLog.create.mockResolvedValue({ id: 'audit-1' })
    transaction.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx))
  })

  it('persists audit and cleanup work in the transaction before deleting the draft', async () => {
    const result = await deleteManualPropertyDraft({ propertyId: property.id, actorUserId: 'admin-1' })

    expect(result).toEqual({ ok: true, property: { id: property.id, title: property.title, intent: 'SALE' }, cleanupJobId: 'cleanup-1' })
    expect(tx.storageCleanupJob.create).toHaveBeenCalledWith({ data: { storageItems: ['manual/property-1/cover.jpg'] } })
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'DRAFT_DELETED', entityId: property.id }),
    }))
    expect(tx.manualProperty.delete).toHaveBeenCalledWith({ where: { id: property.id } })
  })

  it('does not delete a record that is no longer a draft', async () => {
    tx.manualProperty.findFirst.mockResolvedValue({ ...property, status: 'PUBLISHED' })

    const result = await deleteManualPropertyDraft({ propertyId: property.id, actorUserId: 'admin-1' })

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(tx.storageCleanupJob.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
    expect(tx.manualProperty.delete).not.toHaveBeenCalled()
  })

  it('does not delete when audit persistence fails', async () => {
    tx.auditLog.create.mockRejectedValue(new Error('Audit storage unavailable'))

    await expect(deleteManualPropertyDraft({ propertyId: property.id, actorUserId: 'admin-1' }))
      .rejects.toThrow('Audit storage unavailable')

    expect(tx.manualProperty.delete).not.toHaveBeenCalled()
  })

  it('does not delete when cleanup outbox persistence fails', async () => {
    tx.storageCleanupJob.create.mockRejectedValue(new Error('Cleanup queue unavailable'))

    await expect(deleteManualPropertyDraft({ propertyId: property.id, actorUserId: 'admin-1' }))
      .rejects.toThrow('Cleanup queue unavailable')

    expect(tx.auditLog.create).not.toHaveBeenCalled()
    expect(tx.manualProperty.delete).not.toHaveBeenCalled()
  })
})