jest.mock('@/lib/prisma', () => ({ prisma: { $transaction: jest.fn() } }))

import { prisma } from '@/lib/prisma'
import {
  archiveAgent,
  permanentlyDeleteAgent,
  restoreAgent,
} from '@/lib/agentAdminLifecycle'

const database = prisma as any

function createAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agent-1',
    userId: 'user-1',
    approved: true,
    archivedAt: null,
    archivedBy: null,
    archivePriorUserStatus: null,
    archivePriorApproved: null,
    archiveSecurityVersion: null,
    user: {
      role: 'AGENT',
      status: 'ACTIVE',
      securityStateVersion: 4,
    },
    ...overrides,
  }
}

function createTransactionClient(agent = createAgent()) {
  return {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'row-1' }]),
    agent: {
      findUnique: jest.fn().mockResolvedValue(agent),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    manualProperty: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    agentDocument: { findMany: jest.fn().mockResolvedValue([]) },
    storageCleanupJob: { create: jest.fn().mockResolvedValue({ id: 'cleanup-1' }) },
  }
}

describe('agent admin lifecycle', () => {
  let tx: ReturnType<typeof createTransactionClient>

  beforeEach(() => {
    jest.clearAllMocks()
    tx = createTransactionClient()
    database.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    )
  })

  it('archives under row locks, disables visibility/sign-in, and marks only published listings', async () => {
    const result = await archiveAgent('agent-1', 'admin-1')

    expect(result).toMatchObject({ ok: true, agentId: 'agent-1', archivedPropertyCount: 2 })
    expect(tx.manualProperty.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { agentId: 'agent-1', sourceType: 'MANUAL', status: 'PUBLISHED' },
      data: expect.objectContaining({
        status: 'ARCHIVED',
        archivedBy: 'admin-1',
        archivedByAgentActorId: 'admin-1',
      }),
    }))
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { status: 'SUSPENDED', securityStateVersion: { increment: 1 } },
    })
    expect(tx.agent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'agent-1' },
      data: expect.objectContaining({
        approved: false,
        archivePriorUserStatus: 'ACTIVE',
        archivePriorApproved: true,
        archiveSecurityVersion: 5,
      }),
    }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ADMIN_ARCHIVED', entityId: 'agent-1' }),
    }))
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })

  it('restores only properties marked by the matching archive operation', async () => {
    const archivedAt = new Date('2026-10-17T10:00:00.000Z')
    tx = createTransactionClient(createAgent({
      approved: false,
      archivedAt,
      archivedBy: 'admin-1',
      archivePriorUserStatus: 'ACTIVE',
      archivePriorApproved: true,
      archiveSecurityVersion: 5,
      user: { role: 'AGENT', status: 'SUSPENDED', securityStateVersion: 5 },
    }))
    database.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx))

    const result = await restoreAgent('agent-1', 'admin-2')

    expect(result).toMatchObject({ ok: true, archivedPropertyCount: 2, partial: false })
    expect(tx.manualProperty.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'ARCHIVED',
        archivedByAgentAt: archivedAt,
        archivedByAgentActorId: 'admin-1',
      }),
      data: expect.objectContaining({
        status: 'PUBLISHED',
        archivedByAgentAt: null,
        archivedByAgentActorId: null,
      }),
    }))
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { status: 'ACTIVE', securityStateVersion: { increment: 1 } },
    })
  })

  it('preserves a later security decision and reports a partial restore', async () => {
    const archivedAt = new Date('2026-10-17T10:00:00.000Z')
    tx = createTransactionClient(createAgent({
      archivedAt,
      archivedBy: 'admin-1',
      archivePriorUserStatus: 'ACTIVE',
      archivePriorApproved: true,
      archiveSecurityVersion: 5,
      user: { role: 'AGENT', status: 'BANNED', securityStateVersion: 6 },
    }))
    database.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx))

    const result = await restoreAgent('agent-1', 'admin-2')

    expect(result).toMatchObject({ ok: true, partial: true, archivedPropertyCount: 0 })
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(tx.agent.update).not.toHaveBeenCalled()
    expect(tx.manualProperty.updateMany).not.toHaveBeenCalled()
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'ADMIN_RESTORED',
        meta: { operation: 'agent_restore', requiresAdminReview: true },
      }),
    }))
  })

  it('blocks deletion when any dynamically discovered protected Agent foreign key has rows', async () => {
    tx.$queryRaw.mockResolvedValue([{
      schemaName: 'public',
      parentSchemaName: 'public',
      tableName: 'unlisted_agent_history',
      parentTable: 'agents',
      childColumns: ['agent_id'],
      parentColumns: ['id'],
    }])
    tx.$queryRawUnsafe.mockImplementation(async (query: string) => (
      query.startsWith('SELECT count(*)') ? [{ count: 3 }] : [{ id: 'row-1' }]
    ))

    const result = await permanentlyDeleteAgent('agent-1', 'superadmin-1')

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      dependencies: [{ category: 'Linked business history', count: 3 }],
    })
    expect(tx.agent.delete).not.toHaveBeenCalled()
    expect(tx.user.delete).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })

  it('aborts staged audit and cleanup work when a protected reference appears before deletion', async () => {
    const unexpectedReference = {
      schemaName: 'public',
      parentSchemaName: 'public',
      tableName: 'unlisted_agent_history',
      parentTable: 'agents',
      childColumns: ['agent_id'],
      parentColumns: ['id'],
    }
    tx.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([unexpectedReference])
    tx.$queryRawUnsafe.mockImplementation(async (query: string) => (
      query.startsWith('SELECT count(*)') ? [{ count: 1 }] : [{ id: 'row-1' }]
    ))

    const result = await permanentlyDeleteAgent('agent-1', 'superadmin-1')

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(tx.auditLog.create).toHaveBeenCalled()
    expect(tx.storageCleanupJob.create).toHaveBeenCalled()
    expect(tx.agent.delete).not.toHaveBeenCalled()
    expect(tx.user.delete).not.toHaveBeenCalled()
  })

  it('propagates audit failures so the database transaction rolls back', async () => {
    tx.auditLog.create.mockRejectedValue(new Error('audit insert failed'))

    await expect(permanentlyDeleteAgent('agent-1', 'superadmin-1'))
      .rejects.toThrow('audit insert failed')
    expect(tx.agent.delete).not.toHaveBeenCalled()
    expect(tx.user.delete).not.toHaveBeenCalled()
  })

  it('queues private document cleanup and audits before deleting when no protected references exist', async () => {
    tx.agentDocument.findMany.mockResolvedValue([
      { s3Key: 'private/agents/agent-1/documents/id.pdf', fileUrl: '' },
      { s3Key: null, fileUrl: 'https://external.example/document.pdf' },
    ])

    const result = await permanentlyDeleteAgent('agent-1', 'superadmin-1')

    expect(result).toMatchObject({ ok: true, cleanupJobId: 'cleanup-1' })
    expect(tx.storageCleanupJob.create).toHaveBeenCalledWith({
      data: {
        storageItems: [{ type: 'key', key: 'private/agents/agent-1/documents/id.pdf' }],
      },
    })
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'ADMIN_AGENT_DELETED',
        meta: expect.objectContaining({ cleanupJobId: 'cleanup-1' }),
      }),
    }))
    expect(tx.agent.delete).toHaveBeenCalledWith({ where: { id: 'agent-1' } })
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } })
  })
})
