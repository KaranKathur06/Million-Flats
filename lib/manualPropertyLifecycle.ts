export const MANUAL_PROPERTY_PUBLIC_STATUS = 'PUBLISHED' as const

export const MANUAL_PROPERTY_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  MANUAL_PROPERTY_PUBLIC_STATUS,
  'REJECTED',
  'SOLD',
  'ARCHIVED',
] as const

export type ManualPropertyStatusValue = (typeof MANUAL_PROPERTY_STATUSES)[number]

const STATUS_SET = new Set<string>(MANUAL_PROPERTY_STATUSES)

export function isManualPropertyStatus(value: unknown): value is ManualPropertyStatusValue {
  return typeof value === 'string' && STATUS_SET.has(value)
}

export function normalizeManualPropertyStatus(value: unknown): ManualPropertyStatusValue {
  if (value === 'APPROVED') return MANUAL_PROPERTY_PUBLIC_STATUS
  if (isManualPropertyStatus(value)) return value
  return 'DRAFT'
}

export type ManualPropertyLifecycleAction =
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'mark_sold'
  | 'restore_published'
  | 'reject'
  | 'draft'

export function statusForManualPropertyAction(
  action: ManualPropertyLifecycleAction,
  currentStatus: string
): ManualPropertyStatusValue {
  const current = normalizeManualPropertyStatus(currentStatus)

  switch (action) {
    case 'publish':
      if (current !== 'PENDING_REVIEW' && current !== 'DRAFT' && current !== 'ARCHIVED') {
        throw new Error('Only draft, pending, or archived listings can be published.')
      }
      return MANUAL_PROPERTY_PUBLIC_STATUS
    case 'unpublish':
      if (current !== MANUAL_PROPERTY_PUBLIC_STATUS) {
        throw new Error('Only published listings can be unpublished.')
      }
      return 'DRAFT'
    case 'archive':
      if (current === 'ARCHIVED') throw new Error('Listing is already archived.')
      return 'ARCHIVED'
    case 'restore':
      if (current !== 'ARCHIVED' && current !== 'REJECTED') {
        throw new Error('Only archived or rejected listings can be restored to draft.')
      }
      return 'DRAFT'
    case 'mark_sold':
      if (current !== MANUAL_PROPERTY_PUBLIC_STATUS) {
        throw new Error('Only published listings can be marked sold.')
      }
      return 'SOLD'
    case 'restore_published':
      if (current !== 'SOLD' && current !== 'ARCHIVED') {
        throw new Error('Only sold or archived listings can be restored as published.')
      }
      return MANUAL_PROPERTY_PUBLIC_STATUS
    case 'reject':
      if (current !== 'PENDING_REVIEW' && current !== 'DRAFT') {
        throw new Error('Only draft or pending listings can be rejected.')
      }
      return 'REJECTED'
    case 'draft':
      return 'DRAFT'
  }
}

export function isPublishedManualPropertyStatus(status: unknown) {
  return normalizeManualPropertyStatus(status) === MANUAL_PROPERTY_PUBLIC_STATUS
}
