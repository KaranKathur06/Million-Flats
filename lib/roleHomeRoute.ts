type AppRole = 'USER' | 'AGENT' | 'ADMIN' | 'SUPERADMIN'

function normalizeRole(input: unknown): AppRole {
  const r = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (r === 'SUPERADMIN' || r === 'ADMIN' || r === 'AGENT' || r === 'USER') return r
  return 'USER'
}

export function getHomeRouteForRole(role: unknown): string {
  const r = normalizeRole(role)

  if (r === 'ADMIN' || r === 'SUPERADMIN') return '/admin/dashboard'
  if (r === 'AGENT') return '/agent/dashboard'
  return '/dashboard'
}

export function isRoleAllowedForShell(role: unknown, shell: 'admin' | 'agent' | 'user'): boolean {
  const r: AppRole = normalizeRole(role)
  if (shell === 'admin') return r === 'ADMIN' || r === 'SUPERADMIN'
  if (shell === 'agent') return r === 'AGENT'
  return r === 'USER'
}
