import { getAdminActionErrorMessage } from '@/components/admin/AdminActionProvider'

describe('admin action error messages', () => {
  it('keeps meaningful server messages', () => {
    expect(getAdminActionErrorMessage(new Error('Required documents are incomplete.'), 'Fallback')).toBe('Required documents are incomplete.')
  })

  it('hides technical error output behind a safe fallback', () => {
    expect(getAdminActionErrorMessage(new Error('Error: database stack trace'), 'Unable to approve agent.')).toBe('Unable to approve agent.')
    expect(getAdminActionErrorMessage('network failure', 'Unable to approve agent.')).toBe('Unable to approve agent.')
  })
})