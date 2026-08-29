export function normalizeBedrooms(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value

  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return null

  if (/studio|0\s*bhk|0\s*bed/.test(text)) return 0

  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:bhk|rk|bedroom|bedrooms|beds)?/)
  if (!match) return null

  const parsed = Number(match[1])
  if (!Number.isFinite(parsed) || parsed < 0) return null

  if (/\brk\b/.test(text) && parsed === 1) return 1
  return parsed
}
