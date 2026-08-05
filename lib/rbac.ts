export type AppRole =
  | 'USER'
  | 'BUYER'
  | 'AGENT'
  | 'DEVELOPER'
  | 'AGENCY'
  | 'MODERATOR'
  | 'VERIFIER'
  | 'ADMIN'
  | 'SUPERADMIN'

export type PortalName = 'USER' | 'AGENT' | 'DEVELOPER' | 'AGENCY' | 'ADMIN'

export type PermissionName =
  | 'canManageUsers'
  | 'canManageProperties'
  | 'canManageAgents'
  | 'canManageDevelopers'
  | 'canManageContent'
  | 'canVerifyAgents'
  | 'canManageAdmins'
  | 'canAssignRoles'
  | 'canViewAuditLogs'
  | 'canManagePayments'
  | 'canManageCRM'

export const ROLE_POWER: Record<AppRole, number> = {
  USER: 1,
  BUYER: 1,
  DEVELOPER: 2,
  AGENT: 2,
  AGENCY: 2,
  MODERATOR: 3,
  VERIFIER: 4,
  ADMIN: 5,
  SUPERADMIN: 6,
}

const PORTAL_ROLE_MAP: Record<PortalName, AppRole[]> = {
  USER: ['USER', 'BUYER'],
  AGENT: ['AGENT'],
  DEVELOPER: ['DEVELOPER'],
  AGENCY: ['AGENCY'],
  ADMIN: ['SUPERADMIN', 'ADMIN', 'MODERATOR', 'VERIFIER'],
}

const ROLE_PERMISSIONS: Record<AppRole, PermissionName[]> = {
  USER: [],
  BUYER: [],
  AGENT: [],
  DEVELOPER: [],
  AGENCY: [],
  MODERATOR: ['canManageContent', 'canViewAuditLogs'],
  VERIFIER: ['canVerifyAgents'],
  ADMIN: ['canManageUsers', 'canManageProperties', 'canManageAgents', 'canManageDevelopers', 'canViewAuditLogs', 'canAssignRoles'],
  SUPERADMIN: ['canManageUsers', 'canManageProperties', 'canManageAgents', 'canManageDevelopers', 'canManageContent', 'canVerifyAgents', 'canManageAdmins', 'canAssignRoles', 'canViewAuditLogs', 'canManagePayments', 'canManageCRM'],
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
    r === 'AGENCY' ||
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

export function getAllowedRolesForPortal(portal: PortalName | string): AppRole[] {
  const normalizedPortal = typeof portal === 'string' ? portal.toUpperCase() as PortalName : 'USER'
  return PORTAL_ROLE_MAP[normalizedPortal] ?? PORTAL_ROLE_MAP.USER
}

export function getPortalForRole(role: unknown): PortalName {
  const normalized = normalizeRole(role)
  if (PORTAL_ROLE_MAP.ADMIN.includes(normalized)) return 'ADMIN'
  if (PORTAL_ROLE_MAP.AGENT.includes(normalized)) return 'AGENT'
  if (PORTAL_ROLE_MAP.DEVELOPER.includes(normalized)) return 'DEVELOPER'
  if (PORTAL_ROLE_MAP.AGENCY.includes(normalized)) return 'AGENCY'
  return 'USER'
}

export function isRoleAllowedForPortal(role: unknown, portal: PortalName | string): boolean {
  const normalizedRole = normalizeRole(role)
  const normalizedPortal = typeof portal === 'string' ? portal.toUpperCase() as PortalName : 'USER'
  return Boolean(PORTAL_ROLE_MAP[normalizedPortal]?.includes(normalizedRole))
}

export function hasPermission(role: unknown, permission: PermissionName): boolean {
  const normalizedRole = normalizeRole(role)
  return ROLE_PERMISSIONS[normalizedRole]?.includes(permission) ?? false
}

export function getPermissionsForRole(role: unknown): PermissionName[] {
  return ROLE_PERMISSIONS[normalizeRole(role)] ?? []
}
