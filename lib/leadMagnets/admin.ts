export const LEAD_MAGNET_STATUSES = ['draft', 'uploaded', 'published', 'active'] as const

export type LeadMagnetStatusValue = (typeof LEAD_MAGNET_STATUSES)[number]

const leadMagnetStatusSet = new Set<string>(LEAD_MAGNET_STATUSES)

export function normalizeLeadMagnetSlug(input: unknown) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function normalizeLeadMagnetFileKey(input: unknown) {
  const value = String(input || '').trim().replace(/^\/+/, '')
  if (!value) return null
  if (!value.startsWith('private/')) {
    throw new Error('Lead magnet files must use a private S3 key.')
  }
  return value
}

export function hasLeadMagnetFile(input: unknown) {
  return Boolean(normalizeLeadMagnetFileKey(input))
}

export function parseLeadMagnetStatus(input: unknown): LeadMagnetStatusValue | undefined {
  const value = String(input || '').trim().toLowerCase()
  if (leadMagnetStatusSet.has(value)) {
    return value as LeadMagnetStatusValue
  }
  return undefined
}

export function resolveLeadMagnetStatus(params: { status?: unknown; isActive?: unknown; fileS3Key?: unknown }): LeadMagnetStatusValue {
  const hasFile = hasLeadMagnetFile(params.fileS3Key)
  if (!hasFile) return 'draft'
  if (Boolean(params.isActive)) return 'active'

  const parsed = parseLeadMagnetStatus(params.status)
  if (parsed === 'uploaded' || parsed === 'published') {
    return parsed
  }

  return 'published'
}

export function deriveUploadStatus(current: { status?: unknown; isActive?: unknown; fileS3Key?: unknown }): LeadMagnetStatusValue {
  const resolved = resolveLeadMagnetStatus(current)
  if (resolved === 'active') return 'active'
  if (resolved === 'published') return 'published'
  return 'uploaded'
}

export function serializeLeadMagnetAdminItem(item: any) {
  const status = resolveLeadMagnetStatus(item)
  const fileS3Key = normalizeLeadMagnetFileKey(item?.fileS3Key)
  return {
    id: String(item.id),
    slug: String(item.slug),
    title: String(item.title),
    subtitle: item.subtitle ? String(item.subtitle) : '',
    ctaLabel: String(item.ctaLabel || 'Download Free Guide'),
    loginHint: String(item.loginHint || 'Login required'),
    badgeText: item.badgeText ? String(item.badgeText) : '',
    fileS3Key: fileS3Key || '',
    status,
    isActive: status === 'active',
    popupEnabled: Boolean(item.popupEnabled),
    popupDelaySeconds: Number(item.popupDelaySeconds || 4),
    popupScrollPercent: Number(item.popupScrollPercent || 25),
    cooldownHours: Number(item.cooldownHours || 24),
    sortOrder: Number(item.sortOrder || 0),
    downloadsCount: Number(item?._count?.downloads || item?.downloadsCount || 0),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}