import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type VideoAdvertiserUser = {
  id: string
  name: string | null
  email: string
  role: 'AGENT' | 'AGENCY' | 'DEVELOPER'
}

export async function requireVideoAdvertiser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const email = String((session.user as { email?: string | null }).email || '').trim().toLowerCase()
  if (!email) return { ok: false as const, status: 401, message: 'Unauthorized' }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { agent: true, agencyProfile: true, developerProfile: true },
  })

  if (!user || user.status !== 'ACTIVE') {
    return { ok: false as const, status: 403, message: 'An active advertiser account is required' }
  }
  if (!user.emailVerified && !user.phoneVerified && !user.verified) {
    return { ok: false as const, status: 403, message: 'Verify your account before using video campaigns' }
  }

  const role = String(user.role).toUpperCase()
  const verifiedAgent = role === 'AGENT'
    && user.agent?.approved === true
    && user.agent.verificationStatus === 'APPROVED'
    && user.agent.profileStatus === 'LIVE'
  const verifiedAgency = role === 'AGENCY'
    && user.agencyProfile?.isVerified === true
    && user.agencyProfile.kycStatus === 'VERIFIED'
  const verifiedDeveloper = role === 'DEVELOPER'
    && user.developerProfile?.isVerified === true
    && user.developerProfile.kycStatus === 'VERIFIED'

  if (!verifiedAgent && !verifiedAgency && !verifiedDeveloper) {
    return { ok: false as const, status: 403, message: 'A verified Agent, Agency, or Developer profile is required' }
  }

  return {
    ok: true as const,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role as VideoAdvertiserUser['role'],
    } satisfies VideoAdvertiserUser,
  }
}
