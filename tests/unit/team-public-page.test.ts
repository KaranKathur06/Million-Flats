const mockFindMany = jest.fn()
const mockRequireTeamAdmin = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: { findMany: mockFindMany },
  },
}))

jest.mock('@/lib/team/auth', () => ({
  requireTeamAdmin: mockRequireTeamAdmin,
}))

jest.mock('@/app/team/TeamDirectoryClient', () => ({
  __esModule: true,
  default: function TeamDirectoryClient() {
    return null
  },
}))

import { prisma } from '@/lib/prisma'
import TeamDirectoryClient from '@/app/team/TeamDirectoryClient'
import TeamPage from '@/app/team/page'

describe('public team page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireTeamAdmin.mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    })
    mockFindMany.mockResolvedValue([
      {
        id: 'member-1',
        displayName: 'Taylor Example',
        designation: 'Director',
        bio: 'Building better real estate experiences.',
        imageUrl: null,
        linkedinUrl: null,
        location: 'Dubai',
      },
    ])
  })

  it('renders active directory members for visitors without team-admin access', async () => {
    const page = await TeamPage()

    expect(page.type).toBe(TeamDirectoryClient)
    expect(page.props.members).toHaveLength(1)
    expect(page.props.isTeamAdmin).toBe(false)
    expect(prisma.teamMember.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        displayName: true,
        designation: true,
        bio: true,
        imageUrl: true,
        linkedinUrl: true,
        location: true,
      },
    })
  })
})
