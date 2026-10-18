import { describe, expect, it } from '@jest/globals'
import { summarizeCommitOutcomes } from '@/lib/imports/core/commit-outcomes'

describe('persisted import commit outcomes', () => {
  it('derives outcome counters and recovery counts from record rows', () => {
    expect(summarizeCommitOutcomes([
      { status: 'COMMITTED', commitAction: 'created' },
      { status: 'COMMITTED', commitAction: 'updated' },
      { status: 'COMMITTED', commitAction: 'skipped' },
      { status: 'ERROR', commitAction: 'COMMIT_FAILED' },
      { status: 'READY', commitAction: null },
      { status: 'ERROR', commitAction: null },
    ])).toEqual({
      recordCount: 6,
      created: 1,
      updated: 1,
      skipped: 1,
      failed: 1,
      committed: 3,
      rolledBack: 0,
      remaining: 1,
      retryable: 1,
      unresolved: 1,
      inconsistent: 0,
    })
  })

  it('blocks recovery for inconsistent outcomes and analysis-stage failures', () => {
    const inconsistent = summarizeCommitOutcomes([
      { status: 'COMMITTED', commitAction: null },
      { status: 'ERROR', commitAction: null },
    ], { failureStage: 'COMMIT' })

    expect(inconsistent.inconsistent).toBe(2)
    expect(inconsistent.retryable).toBe(0)
    const analysisFailure = summarizeCommitOutcomes([
      { status: 'ERROR', commitAction: null },
    ], { allowLegacyErrors: true, failureStage: 'ANALYSIS' })
    expect(analysisFailure.retryable).toBe(0)
    expect(analysisFailure.unresolved).toBe(1)
  })

  it('uses grouped record counts without losing the row-derived shape', () => {
    expect(summarizeCommitOutcomes([
      { status: 'COMMITTED', commitAction: 'created', count: 4 },
      { status: 'ERROR', commitAction: 'COMMIT_FAILED', count: 2 },
    ])).toMatchObject({
      recordCount: 6,
      created: 4,
      committed: 4,
      failed: 2,
      retryable: 2,
    })
  })

  it('recognizes rolled-back records as terminal without counting them as committed', () => {
    expect(summarizeCommitOutcomes([
      { status: 'SKIPPED', commitAction: 'rolled_back' },
    ])).toMatchObject({ recordCount: 1, committed: 0, rolledBack: 1, inconsistent: 0 })
  })
})
