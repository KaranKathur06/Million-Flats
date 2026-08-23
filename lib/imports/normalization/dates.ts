export function normalizeDate(value: unknown) {
  const display = String(value ?? '').trim()
  if (!display) return { value: null as string | null, display: null as string | null, unresolved: false }
  const date = new Date(display)
  if (Number.isNaN(date.getTime())) return { value: null, display, unresolved: true }
  return { value: date.toISOString(), display, unresolved: false }
}
