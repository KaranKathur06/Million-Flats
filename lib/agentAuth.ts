import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function asUpper(v: unknown) {
  return String(v || '').trim().toUpperCase()
}

export async function requireAgentSession() {
  const session = await getServerSession(authOptions)
  const role = asUpper((session?.user as any)?.role)

  if (!session?.user) {
    return { ok: false as const, status: 401, message: 'Unauthorized', reason: 'UNAUTHENTICATED' as const }
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!dbUser?.agent) {
    return { ok: false as const, status: 403, message: 'Forbidden', reason: 'NOT_AN_AGENT' as const }
  }

  const status = asUpper((dbUser as any)?.status || 'ACTIVE')
  if (status !== 'ACTIVE') {
    return { ok: false as const, status: 403, message: 'Forbidden', reason: status === 'BANNED' ? ('BANNED' as const) : ('SUSPENDED' as const) }
  }

  const agentStatus = asUpper((dbUser.agent as any)?.profileStatus || 'DRAFT')
  if (role !== 'AGENT') {
    return { ok: false as const, status: 403, message: 'Forbidden', reason: 'NOT_PROMOTED' as const, profileStatus: agentStatus }
  }

  if (!dbUser.agent.approved) {
    return { ok: false as const, status: 403, message: 'Forbidden', reason: 'NOT_APPROVED' as const, profileStatus: agentStatus }
  }

  if (agentStatus !== 'LIVE') {
    return { ok: false as const, status: 403, message: 'Forbidden', reason: 'NOT_LIVE' as const, profileStatus: agentStatus }
  }

  return { ok: true as const, agentId: dbUser.agent.id, userId: dbUser.id }
}

export async function requireAgentProfileSession() {
  const session = await getServerSession(authOptions)
  const role = asUpper((session?.user as any)?.role)

  if (!session?.user) {
    return { ok: false as const, status: 401, message: 'Unauthorized', reason: 'UNAUTHENTICATED' as const }
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!dbUser?.agent) {
    return { ok: false as const, status: 403, message: 'Forbidden', reason: 'NOT_AN_AGENT' as const }
  }

  const status = asUpper((dbUser as any)?.status || 'ACTIVE')
  if (status !== 'ACTIVE') {
    return { ok: false as const, status: 403, message: 'Forbidden', reason: status === 'BANNED' ? ('BANNED' as const) : ('SUSPENDED' as const) }
  }

  return {
    ok: true as const,
    agentId: dbUser.agent.id,
    userId: dbUser.id,
    approved: Boolean(dbUser.agent.approved),
    profileStatus: asUpper((dbUser.agent as any)?.profileStatus || 'DRAFT'),
    role,
  }
}
