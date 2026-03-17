import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgentVerifyEmailClient from './AgentVerifyEmailClient'

export default async function AgentVerifyEmailPage() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any

  if (!sessionUser?.email) {
    redirect('/agent/login')
  }

  const email = String(sessionUser.email).trim().toLowerCase()
  const dbUser = await prisma.user.findUnique({ where: { email } })

  if (!dbUser) {
    redirect('/agent/login')
  }

  // If already verified, go to onboarding
  const isVerified = Boolean((dbUser as any).emailVerified) || Boolean((dbUser as any).verified)
  if (isVerified) {
    redirect('/agent/onboarding')
  }

  return <AgentVerifyEmailClient email={email} />
}
