import { AppRole, normalizeRole } from './rbac'

export function isAdminPanelRole(role: unknown): boolean {
  const r: AppRole = normalizeRole(role)
  return r === 'VERIFIER' || r === 'MODERATOR' || r === 'ADMIN' || r === 'SUPERADMIN'
}

export function getHomeRouteForRole(role: unknown): string {
  const r = normalizeRole(role)
  if (isAdminPanelRole(r)) return '/admin'
  if (r === 'AGENT') return '/agent/dashboard'
  if (r === 'DEVELOPER') return '/developer/dashboard'
  if (r === 'AGENCY') return '/agency/dashboard'
  if (r === 'BUYER') return '/dashboard'
  return '/dashboard'
}

export function isRoleAllowedForShell(
  role: unknown,
  shell: 'admin' | 'agent' | 'developer' | 'agency' | 'user'
): boolean {
  const r: AppRole = normalizeRole(role)
  if (shell === 'admin') return isAdminPanelRole(r)
  if (shell === 'agent') return r === 'AGENT'
  if (shell === 'developer') return r === 'DEVELOPER'
  if (shell === 'agency') return r === 'AGENCY'
  return r === 'USER' || r === 'BUYER'
}
