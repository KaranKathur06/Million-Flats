type AppRole = 'USER' | 'AGENT' | 'MODERATOR' | 'VERIFIER' | 'ADMIN' | 'SUPERADMIN'

const ROLE_POWER: Record<AppRole, number> = {
  USER: 1,
  AGENT: 2,
  MODERATOR: 3,
  VERIFIER: 4,
  ADMIN: 5,
  SUPERADMIN: 6,
}

function normalizeRole(input: unknown): AppRole {
  const r = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (r === 'SUPERADMIN' || r === 'ADMIN' || r === 'VERIFIER' || r === 'MODERATOR' || r === 'AGENT' || r === 'USER') return r
  return 'USER'
}

function hasMinRole(userRole: unknown, minRole: AppRole) {
  const role = normalizeRole(userRole)
  return ROLE_POWER[role] >= ROLE_POWER[minRole]
}

export type AdminCapabilities = {
  users: {
    verifyEmail: boolean
    ban: boolean
    delete: boolean
    changeRole: boolean
  }
  agents: {
    approve: boolean
    reject: boolean
    review: boolean
    suspend: boolean
    ban: boolean
    revokeRole: boolean
    viewDocuments: boolean
    approveDocument: boolean
    rejectDocument: boolean
  }
  listings: {
    approve: boolean
    reject: boolean
    archive: boolean
    restore: boolean
    editSafely: boolean
  }
  drafts: {
    delete: boolean
  }
  moderation: {
    properties: {
      approve: boolean
      reject: boolean
    }
  }
}

export function getAdminCapabilities(userRole: unknown): AdminCapabilities {
  const role = normalizeRole(userRole)

  return {
    users: {
      verifyEmail: hasMinRole(role, 'ADMIN'),
      ban: hasMinRole(role, 'SUPERADMIN'),
      delete: hasMinRole(role, 'SUPERADMIN'),
      changeRole: hasMinRole(role, 'SUPERADMIN'),
    },
    agents: {
      approve: hasMinRole(role, 'ADMIN'),
      reject: hasMinRole(role, 'ADMIN'),
      review: hasMinRole(role, 'ADMIN'),
      suspend: hasMinRole(role, 'ADMIN'),
      ban: hasMinRole(role, 'SUPERADMIN'),
      revokeRole: hasMinRole(role, 'SUPERADMIN'),
      viewDocuments: hasMinRole(role, 'ADMIN'),
      approveDocument: hasMinRole(role, 'ADMIN'),
      rejectDocument: hasMinRole(role, 'ADMIN'),
    },
    listings: {
      approve: hasMinRole(role, 'ADMIN'),
      reject: hasMinRole(role, 'ADMIN'),
      archive: hasMinRole(role, 'ADMIN'),
      restore: hasMinRole(role, 'ADMIN'),
      editSafely: hasMinRole(role, 'ADMIN'),
    },
    drafts: {
      delete: hasMinRole(role, 'ADMIN'),
    },
    moderation: {
      properties: {
        approve: hasMinRole(role, 'ADMIN'),
        reject: hasMinRole(role, 'ADMIN'),
      },
    },
  }
}
