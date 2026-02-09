import { requireRole } from '@/lib/rbac'

export async function requireAdminSession() {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) return auth
  return { ok: true as const, userId: auth.userId, email: auth.email, role: auth.role }
}
