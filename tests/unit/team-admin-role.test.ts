jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    teamAccess: { findUnique: jest.fn() },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { requireTeamAdmin } from '@/lib/team/auth'

const getServerSessionMock = getServerSession as jest.Mock
const database = prisma as any

describe('requireTeamAdmin role override', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { email: 'admin@example.com' } })
    database.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      status: 'ACTIVE',
      role: 'ADMIN',
    })
  })

  it.each(['ADMIN', 'SUPERADMIN'])('allows trusted database role %s without TeamAccess', async (role) => {
    database.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      status: 'ACTIVE',
      role,
    })

    await expect(requireTeamAdmin()).resolves.toMatchObject({
      ok: true,
      userId: 'admin-1',
      isTeamAdmin: true,
      teamAccessId: null,
    })
    expect(database.teamAccess.findUnique).not.toHaveBeenCalled()
  })

  it('still requires an active team-admin grant for other roles', async () => {
    database.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      status: 'ACTIVE',
      role: 'USER',
    })

    const result = await requireTeamAdmin()

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      message: 'Team administration access required',
    })
    expect(database.teamAccess.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
    }))
  })

  it('preserves the existing TeamAccess administrator path', async () => {
    database.user.findUnique.mockResolvedValue({
      id: 'team-admin-1',
      email: 'admin@example.com',
      status: 'ACTIVE',
      role: 'USER',
    })
    database.teamAccess.findUnique.mockResolvedValue({
      id: 'access-1',
      isRevoked: false,
      isTeamAdmin: true,
    })

    await expect(requireTeamAdmin()).resolves.toMatchObject({
      ok: true,
      userId: 'team-admin-1',
      teamAccessId: 'access-1',
    })
  })
})
