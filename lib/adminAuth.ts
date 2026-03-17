import { requireRole } from '@/lib/rbacServer'
import { NextResponse } from 'next/server'

export async function requireAdminSession() {
  const auth = await requireRole('MODERATOR')
  if (!auth.ok) return auth
  return { ok: true as const, userId: auth.userId, email: auth.email, role: auth.role }
}

export async function requireAdmin(req?: Request) {
  const session = await requireAdminSession()
  if (!session.ok) {
    if (session.status === 401) {
      return NextResponse.json({ error: session.message || 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: session.message || 'Forbidden' }, { status: 403 })
  }
  return null
}
