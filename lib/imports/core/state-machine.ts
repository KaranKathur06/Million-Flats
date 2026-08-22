export type ImportBatchState =
  | 'UPLOADED'
  | 'ANALYZING'
  | 'READY_FOR_REVIEW'
  | 'MAPPING_REVIEW'
  | 'NORMALIZING'
  | 'VALIDATING'
  | 'DUPLICATE_REVIEW'
  | 'READY_TO_COMMIT'
  | 'COMMITTING'
  | 'COMMITTED'
  | 'PARTIALLY_COMMITTED'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED'

const transitions: Record<ImportBatchState, ImportBatchState[]> = {
  UPLOADED: ['ANALYZING', 'CANCELLED'],
  ANALYZING: ['READY_FOR_REVIEW', 'READY_TO_COMMIT', 'FAILED', 'CANCELLED'],
  READY_FOR_REVIEW: ['ANALYZING', 'MAPPING_REVIEW', 'NORMALIZING', 'READY_TO_COMMIT', 'CANCELLED'],
  MAPPING_REVIEW: ['NORMALIZING', 'READY_FOR_REVIEW', 'READY_TO_COMMIT', 'CANCELLED'],
  NORMALIZING: ['VALIDATING', 'READY_TO_COMMIT', 'FAILED', 'CANCELLED'],
  VALIDATING: ['DUPLICATE_REVIEW', 'READY_TO_COMMIT', 'FAILED', 'CANCELLED'],
  DUPLICATE_REVIEW: ['READY_TO_COMMIT', 'VALIDATING', 'CANCELLED'],
  READY_TO_COMMIT: ['COMMITTING', 'CANCELLED'],
  COMMITTING: ['COMMITTED', 'PARTIALLY_COMMITTED', 'FAILED'],
  COMMITTED: [],
  PARTIALLY_COMMITTED: [],
  FAILED: ['RETRYING'],
  RETRYING: ['ANALYZING', 'FAILED'],
  CANCELLED: [],
}

export function canTransition(from: ImportBatchState, to: ImportBatchState) {
  return transitions[from].includes(to)
}

export function transitionBatch(from: ImportBatchState, to: ImportBatchState) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid import batch transition: ${from} -> ${to}`)
  }
  return to
}

export function invalidateAfterMappingChange(): ImportBatchState {
  return 'READY_FOR_REVIEW'
}

export function invalidateAfterOwnershipChange(): ImportBatchState {
  return 'VALIDATING'
}

export function isTerminalState(state: ImportBatchState) {
  return state === 'COMMITTED' || state === 'PARTIALLY_COMMITTED' || state === 'CANCELLED'
}
