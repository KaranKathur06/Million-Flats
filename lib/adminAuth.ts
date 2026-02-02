import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  if (role !== 'ADMIN') {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    return { ok: false as const, status: 401, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({ where: { email } })
  if (!dbUser || String(dbUser.role || '').toUpperCase() !== 'ADMIN') {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  return { ok: true as const, userId: dbUser.id, email: dbUser.email }
}
