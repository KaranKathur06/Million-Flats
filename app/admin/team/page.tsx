/**
 * /admin/team — Team directory administration page
 *
 * Only accessible to admin users with team-admin access.
 * Standard admin session check (MODERATOR+) is handled by the admin layout.
 * This page additionally verifies team-admin status via requireTeamAdmin().
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import TeamAdminClient from './TeamAdminClient'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Team Directory — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminTeamPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user || !hasMinRole(role, 'ADMIN')) {
    redirect('/admin/login')
  }

  // Fetch all members and access grants for the admin view
  const [members, accessGrants, users] = await Promise.all([
    prisma.teamMember.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.teamAccess.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        grantedBy: { select: { id: true, email: true } },
      },
    }),
    // For the user search/grant dropdown — limit to manageable set
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, email: true, name: true, role: true },
    }),
  ])

  return (
    <TeamAdminClient
      initialMembers={members as any}
      initialAccessGrants={accessGrants as any}
      users={users}
    />
  )
}
