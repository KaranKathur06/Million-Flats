export function normalizeArea(value: unknown, unit?: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return { amount: null as number | null, unit: null as string | null, display: null as string | null, unresolved: false }
  const display = raw
  const parsed = Number(raw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)?.[0])
  if (!Number.isFinite(parsed)) return { amount: null, unit: String(unit || '').trim() || null, display, unresolved: true }
  const normalizedUnit = String(unit || raw.match(/sq\.?\s*(ft|feet)|sqm|m²|m2/i)?.[0] || 'sq ft').toLowerCase()
  const amount = /sqm|m²|m2/.test(normalizedUnit) ? parsed * 10.7639 : parsed
  return { amount: Math.round(amount * 100) / 100, unit: normalizedUnit, display, unresolved: false }
}
