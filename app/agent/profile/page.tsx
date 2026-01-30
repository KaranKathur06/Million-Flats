import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgentProfileClient from './AgentProfileClient'

export default async function AgentProfilePage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/login?next=%2Fagent%2Fprofile')
  }

  if (role !== 'AGENT') {
    redirect('/user/dashboard')
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    redirect('/agent/login?next=%2Fagent%2Fprofile')
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!user) {
    redirect('/agent/login?next=%2Fagent%2Fprofile')
  }

  return (
    <AgentProfileClient
      initialName={user.name || ''}
      email={user.email}
      initialPhone={user.phone || ''}
      initialCompany={user.agent?.company || ''}
      initialLicense={user.agent?.license || ''}
      initialWhatsapp={user.agent?.whatsapp || ''}
    />
  )
}
