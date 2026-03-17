import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AgentVerificationCenter from './ui/AgentVerificationCenter'

export const metadata = {
  title: 'Verification Center | MillionFlats Agent',
  description: 'Upload your documents and get verified to start listing properties on MillionFlats.',
}

export default async function AgentVerificationPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/login?next=%2Fagent%2Fverification')
  }

  if (role !== 'AGENT') {
    redirect(getHomeRouteForRole(role))
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    redirect('/agent/login?next=%2Fagent%2Fverification')
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!user || !user.agent) {
    redirect('/agent/login?next=%2Fagent%2Fverification')
  }

  const agentRow = await (prisma as any).agent
    .findUnique({
      where: { id: user.agent.id },
      select: {
        id: true,
        profileStatus: true,
        license: true,
        bio: true,
        profilePhoto: true,
        profileImageUrl: true,
      },
    })
    .catch(() => null)

  const profileStatus = String(
    (agentRow as any)?.profileStatus || (user.agent as any)?.profileStatus || 'DRAFT'
  ).toUpperCase()
  const agentStatus = String((user.agent as any)?.status || 'REGISTERED').toUpperCase()
  const license = String((agentRow as any)?.license || user.agent?.license || '')
  const bio = String((agentRow as any)?.bio || (user.agent as any)?.bio || '')
  const photo = String((agentRow as any)?.profileImageUrl || (agentRow as any)?.profilePhoto || '')
  const phone = String(user.phone || '')

  return (
    <AgentVerificationCenter
      agentName={user.name || 'Agent'}
      profileStatus={profileStatus}
      agentStatus={agentStatus}
      license={license}
      bio={bio}
      photo={photo}
      phone={phone}
    />
  )
}
