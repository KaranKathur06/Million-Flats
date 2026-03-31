export function parseAEDInput(input: unknown): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input) : null

  const raw = String(input).trim().toUpperCase().replace(/,/g, '')
  if (!raw) return null

  const matched = raw.match(/^(\d+(?:\.\d+)?)([KMB])?$/)
  if (!matched) return null

  const value = Number(matched[1])
  if (!Number.isFinite(value)) return null

  const unit = matched[2] || ''
  const multiplier = unit === 'B' ? 1_000_000_000 : unit === 'M' ? 1_000_000 : unit === 'K' ? 1_000 : 1
  return Math.round(value * multiplier)
}

export function formatAEDCompact(input: number | null | undefined): string {
  const value = typeof input === 'number' ? input : 0
  if (!Number.isFinite(value) || value <= 0) return 'AED 0'
  if (value >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(2).replace(/\.?0+$/, '')}K`
  return `AED ${Math.round(value).toLocaleString()}`
}

