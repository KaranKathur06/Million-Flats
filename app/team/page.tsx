/**
 * /team — private internal team directory page (Server Component)
 *
 * Fetches active team members directly from the database.
 * Authorization was already enforced by the layout.
 * This page is NOT statically generated and is NOT publicly indexed.
 */

import { prisma } from '@/lib/prisma'
import { requireTeamAccess } from '@/lib/team/auth'
import { redirect } from 'next/navigation'
import TeamDirectoryClient from './TeamDirectoryClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function TeamPage() {
  // Secondary auth check at data-access boundary (layout already checked,
  // this ensures correct isTeamAdmin flag reaches the client component)
  const auth = await requireTeamAccess()
  if (!auth.ok) {
    redirect('/unauthorized?reason=team_access_required')
  }

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
      isTeamAdmin={auth.isTeamAdmin}
    />
  )
}
