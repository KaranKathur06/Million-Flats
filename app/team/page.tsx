import { prisma } from '@/lib/prisma'
import { requireTeamAdmin } from '@/lib/team/auth'
import TeamDirectoryClient from './TeamDirectoryClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function TeamPage() {
  const adminAccess = await requireTeamAdmin()

  const members = await prisma.teamMember.findMany({
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

  return (
    <TeamDirectoryClient
      members={members}
      isTeamAdmin={adminAccess.ok}
    />
  )
}
