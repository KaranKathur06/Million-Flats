import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRedirectPath } from '@/lib/auth/getRedirectPath'

export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const nextRaw = searchParams?.next
  const next = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : ''

  const session = await getServerSession(authOptions)
  const sessionRole = String((session?.user as any)?.role || '').toUpperCase()
  const hasSession = Boolean(session?.user)

  const legacyToken = cookies().get('token')?.value
  const jwtSecret = process.env.JWT_SECRET
  let legacyRole = ''
  let hasLegacyToken = false
  if (legacyToken && jwtSecret) {
    try {
      const decoded = jwt.verify(legacyToken, jwtSecret) as any
      legacyRole = String(decoded?.role || '').toUpperCase()
      hasLegacyToken = true
    } catch {
      legacyRole = ''
    }
  }

  if (!hasSession && !legacyRole) {
    if (safeNext) {
      redirect(`/auth/login?next=${encodeURIComponent(safeNext)}`)
    }
    redirect('/auth/login')
  }

  const email = String((session?.user as any)?.email || '').trim().toLowerCase()
  const dbRole = email
    ? String((await prisma.user.findUnique({ where: { email }, select: { role: true } }))?.role || '').toUpperCase()
    : ''

  const effectiveRole = dbRole || sessionRole || legacyRole
  const home = getRedirectPath(effectiveRole)

  if (safeNext) {
    redirect(safeNext)
  }

  redirect(home)
}
