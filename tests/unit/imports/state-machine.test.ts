import {
  canTransition,
  invalidateAfterMappingChange,
  invalidateAfterOwnershipChange,
  isTerminalState,
  transitionBatch,
} from '@/lib/imports/core/state-machine'

describe('import batch state machine', () => {
  it('allows conditional review states', () => {
    expect(canTransition('READY_FOR_REVIEW', 'ANALYZING')).toBe(true)
    expect(canTransition('READY_FOR_REVIEW', 'NORMALIZING')).toBe(true)
    expect(canTransition('READY_FOR_REVIEW', 'MAPPING_REVIEW')).toBe(true)
    expect(canTransition('READY_FOR_REVIEW', 'READY_TO_COMMIT')).toBe(true)
    expect(canTransition('VALIDATING', 'READY_TO_COMMIT')).toBe(true)
    expect(canTransition('VALIDATING', 'DUPLICATE_REVIEW')).toBe(true)
  })

  it('rejects production mutation before readiness', () => {
    expect(() => transitionBatch('VALIDATING', 'COMMITTING')).toThrow()
  })

  it('invalidates stale downstream state after review changes', () => {
    expect(invalidateAfterMappingChange()).toBe('READY_FOR_REVIEW')
    expect(invalidateAfterOwnershipChange()).toBe('VALIDATING')
  })

  it('recognizes terminal outcomes', () => {
    expect(isTerminalState('COMMITTED')).toBe(true)
    expect(isTerminalState('PARTIALLY_COMMITTED')).toBe(true)
    expect(isTerminalState('FAILED')).toBe(false)
  })
})
