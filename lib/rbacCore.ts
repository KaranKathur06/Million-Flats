export type AppRole = 'USER' | 'AGENT' | 'ADMIN' | 'SUPERADMIN'

export const ROLE_POWER: Record<AppRole, number> = {
  USER: 1,
  AGENT: 2,
  ADMIN: 3,
  SUPERADMIN: 4,
}

export function normalizeRole(input: unknown): AppRole {
  const r = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (r === 'SUPERADMIN' || r === 'ADMIN' || r === 'AGENT' || r === 'USER') return r
  return 'USER'
}

export function hasMinRole(userRole: unknown, minRole: AppRole) {
  const role = normalizeRole(userRole)
  return ROLE_POWER[role] >= ROLE_POWER[minRole]
}
