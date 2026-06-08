/** Normalize lead counts from API / DB (handles string, bigint, null during hydration). */
export function normalizeLeadCount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'bigint') return Number(value)
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** True when dashboard KPI count matches table row count for the same filter scope. */
export function isLeadCountInSync(dashboardCount: unknown, tableCount: unknown): boolean {
  return normalizeLeadCount(dashboardCount) === normalizeLeadCount(tableCount)
}
