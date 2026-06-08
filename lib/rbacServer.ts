import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole, type AppRole } from '@/lib/rbac'

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
