export type AppRole =
  | 'USER'
  | 'BUYER'
  | 'AGENT'
  | 'DEVELOPER'
  | 'MODERATOR'
  | 'VERIFIER'
  | 'ADMIN'
  | 'SUPERADMIN'

export const ROLE_POWER: Record<AppRole, number> = {
  USER: 1,
  BUYER: 1,
  DEVELOPER: 2,
  AGENT: 2,
  MODERATOR: 3,
  VERIFIER: 4,
  ADMIN: 5,
  SUPERADMIN: 6,
}

export function normalizeRole(input: unknown): AppRole {
  const r = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (
    r === 'SUPERADMIN' ||
    r === 'ADMIN' ||
    r === 'VERIFIER' ||
    r === 'MODERATOR' ||
    r === 'AGENT' ||
    r === 'DEVELOPER' ||
    r === 'BUYER' ||
    r === 'USER'
  )
    return r as AppRole
  return 'USER'
}

export function hasMinRole(userRole: unknown, minRole: AppRole) {
  const role = normalizeRole(userRole)
  return ROLE_POWER[role] >= ROLE_POWER[minRole]
}
