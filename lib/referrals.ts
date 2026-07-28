export type ReferralOption = {
  value: string
  label: string
}

const REFERRAL_OPTIONS: ReferralOption[] = [
  { value: 'google-search', label: 'Google Search' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referral' },
  { value: 'partner', label: 'Partner / Agency' },
  { value: 'other', label: 'Other' },
]

export function getReferralOptions(): ReferralOption[] {
  return REFERRAL_OPTIONS
}

export function normalizeReferralSource(value: string): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, '-')

  if (!normalized) return ''
  if (normalized === 'linkedin') return 'linkedin'
  if (normalized === 'instagram') return 'instagram'
  if (normalized === 'facebook') return 'facebook'
  if (normalized === 'whatsapp') return 'whatsapp'
  if (normalized === 'google' || normalized === 'google-search') return 'google-search'
  if (normalized === 'referral' || normalized === 'recommendation') return 'referral'
  if (normalized === 'partner' || normalized === 'partner/agency' || normalized === 'agency') return 'partner'
  return normalized
}
