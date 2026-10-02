jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { $transaction: jest.fn() } }))

import { prisma } from '@/lib/prisma'
import { permanentlyDeleteProject } from '@/lib/projectPermanentDeleteService'

const database = prisma as any
const project = {
  id: 'project-1',
  name: 'Project One',
  slug: 'project-one',
  status: 'PUBLISHED',
  isDeleted: true,
  deletedAt: new Date('2026-09-01T00:00:00.000Z'),
  developer: { slug: 'developer-one' },
  media: [{ s3Key: 'media/hero.jpg', mediaUrl: '' }],
  floorPlans: [{ s3Key: 'floor-plans/plan.pdf', imageUrl: '' }],
  brochure: { s3Key: 'brochures/guide.pdf', fileUrl: '' },
}

function createTransactionClient() {
  return {
    project: { findUnique: jest.fn(), deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
    storageCleanupJob: { create: jest.fn() },
  }
}

describe('project permanent deletion service', () => {
  let tx: ReturnType<typeof createTransactionClient>

  beforeEach(() => {
    jest.clearAllMocks()
    tx = createTransactionClient()
    tx.project.findUnique.mockResolvedValue(project)
    tx.project.deleteMany.mockResolvedValue({ count: 1 })
    tx.auditLog.create.mockResolvedValue({ id: 'audit-1' })
    tx.storageCleanupJob.create.mockResolvedValue({ id: 'cleanup-1' })
    database.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx))
  })

  it('atomically audits deletion and queues project media plus folder cleanup', async () => {
    const result = await permanentlyDeleteProject(project.id, 'superadmin-1')

    expect(result).toEqual({ ok: true, project: { id: project.id, slug: project.slug }, cleanupJobId: 'cleanup-1' })
    expect(tx.storageCleanupJob.create).toHaveBeenCalledWith({
      data: {
        storageItems: [
          { type: 'key', key: 'media/hero.jpg' },
          { type: 'key', key: 'floor-plans/plan.pdf' },
          { type: 'key', key: 'brochures/guide.pdf' },
          { type: 'folder', prefix: 'public/projects/developer-one/project-one' },
        ],
      },
    })
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ entityId: project.id, action: 'PROJECT_HARD_DELETED' }),
    }))
    expect(tx.project.deleteMany).toHaveBeenCalledWith({ where: { id: project.id, isDeleted: true } })
  })

  it('rejects projects that have not been soft-deleted', async () => {
    tx.project.findUnique.mockResolvedValue({ ...project, isDeleted: false })

    const result = await permanentlyDeleteProject(project.id, 'superadmin-1')

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(tx.storageCleanupJob.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
    expect(tx.project.deleteMany).not.toHaveBeenCalled()
  })

  it('rolls back when the conditional database deletion loses a race', async () => {
    tx.project.deleteMany.mockResolvedValue({ count: 0 })

    await expect(permanentlyDeleteProject(project.id, 'superadmin-1'))
      .rejects.toThrow('Project must remain soft-deleted until permanent deletion commits.')
  })
})
