import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type AppRole = 'USER' | 'AGENT' | 'ADMIN' | 'SUPERADMIN'

export const ROLE_POWER: Record<AppRole, number> = {
  USER: 1,
  AGENT: 2,
  ADMIN: 3,
  SUPERADMIN: 4,
}

export function normalizeRole(input: unknown): AppRole {
  const r = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (r === 'SUPERADMIN' || r === 'ADMIN' || r === 'AGENT' || r === 'USER') return r
  return 'USER'
}

export function hasMinRole(userRole: unknown, minRole: AppRole) {
  const role = normalizeRole(userRole)
  return ROLE_POWER[role] >= ROLE_POWER[minRole]
}

export async function requireRole(minRole: AppRole) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({ where: { email } })
  if (!dbUser) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const role = normalizeRole((dbUser as any).role)
  if (!hasMinRole(role, minRole)) {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  return {
    ok: true as const,
    userId: dbUser.id,
    email: dbUser.email,
    role,
  }
}
