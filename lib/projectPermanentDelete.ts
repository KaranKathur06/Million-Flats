export function isPermanentDeleteAllowed(project: { isDeleted?: boolean | null; status?: string | null }) {
  return Boolean(project?.isDeleted)
}

export function getPermanentDeleteStatus(project: { isDeleted?: boolean | null; status?: string | null }) {
  if (!project || !isPermanentDeleteAllowed(project)) {
    return {
      ok: false,
      reason: 'Project must be soft-deleted before permanent deletion is allowed.',
    }
  }

  return { ok: true }
}

export function validatePermanentDeleteConfirmation(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (normalized !== 'DELETE') {
    return {
      ok: false,
      message: 'Confirmation text must be exactly DELETE',
    }
  }

  return { ok: true }
}

export function collectProjectOwnedS3Keys(project: {
  media?: Array<{ s3Key?: string | null } | null> | null
  floorPlans?: Array<{ s3Key?: string | null } | null> | null
  brochure?: { s3Key?: string | null } | null
}) {
  const keys = [
    ...(project?.media || []).map((item) => item?.s3Key).filter((key): key is string => !!key && typeof key === 'string' && key.trim().length > 0),
    ...(project?.floorPlans || []).map((item) => item?.s3Key).filter((key): key is string => !!key && typeof key === 'string' && key.trim().length > 0),
    ...(project?.brochure?.s3Key ? [project.brochure.s3Key] : []),
  ]

  return Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean)))
}

export function getPermanentDeleteSummary(project: { name?: string | null; slug?: string | null; isDeleted?: boolean | null }) {
  return {
    allowed: isPermanentDeleteAllowed(project),
    label: project?.name || project?.slug || 'Project',
  }
}
