export type OnboardingCountryInput =
  | { kind: 'omitted' }
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'value'; iso2: string }

export function normalizeOnboardingCountryIso2(value: unknown): OnboardingCountryInput {
  if (value === undefined) return { kind: 'omitted' }
  if (typeof value !== 'string') return { kind: 'invalid' }

  const normalized = value.trim().toUpperCase()
  if (!normalized) return { kind: 'empty' }

  const iso2 = normalized === 'UK' ? 'GB' : normalized
  if (!/^[A-Z]{2}$/.test(iso2)) return { kind: 'invalid' }

  return { kind: 'value', iso2 }
}
