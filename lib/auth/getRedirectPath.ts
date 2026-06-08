import { normalizeRole, type AppRole } from '@/lib/rbac'
import { isAdminPanelRole } from '@/lib/roleHomeRoute'

export function getRedirectPath(role: unknown): string {
  const r: AppRole = normalizeRole(role)

  if (isAdminPanelRole(r)) return '/admin'
  if (r === 'AGENT') return '/agent/dashboard'
  return '/dashboard'
}
