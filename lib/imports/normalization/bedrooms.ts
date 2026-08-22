export function normalizeBedrooms(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return null
  if (/studio|0\s*bhk|0\s*bed/.test(text)) return 0
  const match = text.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}
