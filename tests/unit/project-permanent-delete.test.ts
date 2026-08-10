import { describe, expect, it } from '@jest/globals'
import { isPermanentDeleteAllowed, validatePermanentDeleteConfirmation } from '@/lib/projectPermanentDelete'

describe('project permanent delete guards', () => {
  it('allows permanent deletion only for deleted projects', () => {
    expect(isPermanentDeleteAllowed({ isDeleted: true })).toBe(true)
    expect(isPermanentDeleteAllowed({ isDeleted: false })).toBe(false)
  })

  it('requires exact DELETE confirmation', () => {
    expect(validatePermanentDeleteConfirmation('DELETE')).toEqual({ ok: true })
    expect(validatePermanentDeleteConfirmation('delete')).toEqual({ ok: false, message: 'Confirmation text must be exactly DELETE' })
    expect(validatePermanentDeleteConfirmation('')).toEqual({ ok: false, message: 'Confirmation text must be exactly DELETE' })
  })
})
