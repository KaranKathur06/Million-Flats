import { AppRole, normalizeRole } from './rbac'

export function getHomeRouteForRole(role: unknown): string {
  const r = normalizeRole(role)
  if (r === 'ADMIN' || r === 'SUPERADMIN') return '/admin'
  if (r === 'AGENT') return '/agent/dashboard'
  if (r === 'DEVELOPER') return '/developer/dashboard'
  if (r === 'BUYER') return '/dashboard'
  return '/dashboard'
}

export function isRoleAllowedForShell(
  role: unknown,
  shell: 'admin' | 'agent' | 'developer' | 'user'
): boolean {
  const r: AppRole = normalizeRole(role)
  if (shell === 'admin') return r === 'ADMIN' || r === 'SUPERADMIN'
  if (shell === 'agent') return r === 'AGENT'
  if (shell === 'developer') return r === 'DEVELOPER'
  return r === 'USER' || r === 'BUYER'
}
