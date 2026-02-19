import { normalizeRole, type AppRole } from '@/lib/rbac'

export function getRedirectPath(role: unknown): string {
  const r: AppRole = normalizeRole(role)

  if (r === 'ADMIN' || r === 'SUPERADMIN') return '/admin/dashboard'
  if (r === 'AGENT') return '/agent/dashboard'
  return '/dashboard'
}
