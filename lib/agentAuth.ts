import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function requireAgentSession() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  if (role !== 'AGENT') {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!dbUser?.agent) {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  const status = String((dbUser as any)?.status || 'ACTIVE').toUpperCase()
  if (status !== 'ACTIVE') {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  if (!dbUser.agent.approved) {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  return { ok: true as const, agentId: dbUser.agent.id, userId: dbUser.id }
}

export async function requireAgentProfileSession() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  if (role !== 'AGENT') {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!dbUser?.agent) {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  const status = String((dbUser as any)?.status || 'ACTIVE').toUpperCase()
  if (status !== 'ACTIVE') {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  return {
    ok: true as const,
    agentId: dbUser.agent.id,
    userId: dbUser.id,
    approved: Boolean(dbUser.agent.approved),
    profileStatus: String((dbUser.agent as any)?.profileStatus || 'DRAFT'),
  }
}
