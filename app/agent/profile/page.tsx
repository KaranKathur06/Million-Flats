import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AgentProfileClient from './AgentProfileClient'

export default async function AgentProfilePage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/login?next=%2Fagent%2Fprofile')
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    redirect('/agent/login?next=%2Fagent%2Fprofile')
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!user) {
    redirect('/agent/login?next=%2Fagent%2Fprofile')
  }

  const status = String((user as any)?.status || 'ACTIVE').toUpperCase()
  if (status !== 'ACTIVE') {
    redirect('/agent/login?error=account_disabled')
  }

  if (!user.agent) {
    redirect('/agent/onboarding')
  }

  const agentRow = await (prisma as any).agent
    .findUnique({
      where: { id: user.agent.id },
      select: { id: true, profilePhoto: true, profileImageUrl: true, profileImageKey: true, profileImageUpdatedAt: true, profileStatus: true, profileCompletion: true },
    })
    .catch(() => null)

  const profileStatus = String((agentRow as any)?.profileStatus || (user.agent as any)?.profileStatus || 'DRAFT').toUpperCase()

  return (
    <AgentProfileClient
      sessionRole={role}
      initialName={user.name || ''}
      email={user.email}
      initialPhone={user.phone || ''}
      initialImage={String((agentRow as any)?.profileImageUrl || (agentRow as any)?.profilePhoto || '')}
      initialImageUpdatedAt={String((agentRow as any)?.profileImageUpdatedAt || '')}
      initialCompany={user.agent?.company || ''}
      initialLicense={user.agent?.license || ''}
      initialWhatsapp={user.agent?.whatsapp || ''}
      initialBio={(user.agent as any)?.bio || ''}
      profileStatus={profileStatus}
      profileCompletion={Number((agentRow as any)?.profileCompletion || (user.agent as any)?.profileCompletion || 0)}
    />
  )
}
