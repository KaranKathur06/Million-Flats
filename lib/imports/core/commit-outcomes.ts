export type CommitOutcomeRecord = {
  status: string
  commitAction?: string | null
  count?: number
}

export type CommitOutcomeSummary = {
  recordCount: number
  created: number
  updated: number
  skipped: number
  failed: number
  committed: number
  rolledBack: number
  remaining: number
  retryable: number
  unresolved: number
  inconsistent: number
}

export function summarizeCommitOutcomes(
  records: readonly CommitOutcomeRecord[],
  options: { allowLegacyErrors?: boolean; failureStage?: string } = {},
): CommitOutcomeSummary {
  const summary: CommitOutcomeSummary = {
    recordCount: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    committed: 0,
    rolledBack: 0,
    remaining: 0,
    retryable: 0,
    unresolved: 0,
    inconsistent: 0,
  }

  for (const record of records) {
    const count = Number.isInteger(record.count) && (record.count ?? 0) >= 0
      ? record.count ?? 0
      : 1
    summary.recordCount += count

    if (record.status === 'COMMITTED') {
      summary.committed += count
      if (record.commitAction === 'created') summary.created += count
      else if (record.commitAction === 'updated') summary.updated += count
      else if (record.commitAction === 'skipped') summary.skipped += count
      else summary.inconsistent += count
      continue
    }

    if (record.status === 'SKIPPED' && record.commitAction === 'rolled_back') {
      summary.rolledBack += count
      continue
    }

    if (record.status === 'READY' || record.status === 'WARNING' || record.status === 'STAGED') {
      summary.remaining += count
      if (record.commitAction != null) summary.inconsistent += count
      continue
    }

    if (record.status === 'ERROR') {
      if (
        options.failureStage !== 'ANALYSIS' &&
        (record.commitAction === 'COMMIT_FAILED' || options.allowLegacyErrors)
      ) {
        summary.failed += count
        summary.retryable += count
      } else if (options.failureStage === 'COMMIT') {
        summary.inconsistent += count
      } else {
        summary.unresolved += count
      }
      continue
    }

    summary.inconsistent += count
  }

  return summary
}
