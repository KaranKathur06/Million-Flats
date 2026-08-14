import {
  MANUAL_PROPERTY_PUBLIC_STATUS,
  isPublishedManualPropertyStatus,
  normalizeManualPropertyStatus,
  statusForManualPropertyAction,
} from '../../lib/manualPropertyLifecycle'
import { buildManualPropertyPath, parseManualPropertySlug } from '../../lib/manualPropertyRoutes'

describe('manual property lifecycle and routing', () => {
  it('uses PUBLISHED as the public manual-property state', () => {
    expect(MANUAL_PROPERTY_PUBLIC_STATUS).toBe('PUBLISHED')
    expect(normalizeManualPropertyStatus('PUBLISHED')).toBe('PUBLISHED')
    expect(normalizeManualPropertyStatus('APPROVED')).toBe('PUBLISHED')
    expect(isPublishedManualPropertyStatus('APPROVED')).toBe(true)
  })

  it('maps semantic admin actions to lifecycle statuses', () => {
    expect(statusForManualPropertyAction('publish', 'PENDING_REVIEW')).toBe('PUBLISHED')
    expect(statusForManualPropertyAction('publish', 'DRAFT')).toBe('PUBLISHED')
    expect(statusForManualPropertyAction('unpublish', 'PUBLISHED')).toBe('DRAFT')
    expect(statusForManualPropertyAction('mark_sold', 'PUBLISHED')).toBe('SOLD')
    expect(statusForManualPropertyAction('restore_published', 'ARCHIVED')).toBe('PUBLISHED')
  })

  it('routes sale listings to buy and rent listings to rent', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(buildManualPropertyPath({ id, title: 'Sea View Apartment', intent: 'SALE' })).toBe(`/buy/sea-view-apartment-${id}`)
    expect(buildManualPropertyPath({ id, title: 'Sea View Apartment', intent: 'RENT' })).toBe(`/rent/sea-view-apartment-${id}`)
    expect(parseManualPropertySlug(`sea-view-apartment-${id}`)).toBe(id)
  })
})
