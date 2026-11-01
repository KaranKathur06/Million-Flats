import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type EcosystemUser = {
  id: string
  email: string
  role: string
}

export async function getAuthenticatedEcosystemUser(): Promise<EcosystemUser | null> {
  const session = await getServerSession(authOptions)
  const email = String(session?.user?.email || '').trim().toLowerCase()
  if (!email) return null

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, status: true, emailVerified: true, verified: true },
  })

  if (!user || user.status !== 'ACTIVE' || (!user.emailVerified && !user.verified)) return null
  return { id: user.id, email: user.email, role: user.role }
}
