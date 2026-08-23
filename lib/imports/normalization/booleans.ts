const TRUE_VALUES = new Set(['true', 'yes', 'y', '1', 'on'])
const FALSE_VALUES = new Set(['false', 'no', 'n', '0', 'off'])

export function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (TRUE_VALUES.has(normalized)) return true
  if (FALSE_VALUES.has(normalized)) return false
  return null
}
