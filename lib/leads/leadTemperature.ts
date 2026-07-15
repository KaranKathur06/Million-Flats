/** AILead-style temperature for 3D Tour pipeline prioritization */

export type LeadTemperature = 'HOT' | 'WARM' | 'COLD'

export function threeDTourLeadTemperature(params: {
  timeline?: string | null
  budgetRange?: string | null
}): LeadTemperature {
  const timeline = String(params.timeline || '').toUpperCase()
  const budget = String(params.budgetRange || '').toUpperCase()

  if (timeline === 'IMMEDIATELY' || budget === '100K_PLUS') return 'HOT'
  if (timeline === 'WITHIN_7_DAYS' || budget === '50K_100K' || budget === '25K_50K') return 'WARM'
  return 'COLD'
}

export const LEAD_TEMPERATURE_STYLES: Record<
  LeadTemperature,
  { label: string; className: string }
> = {
  HOT: {
    label: 'Hot Lead',
    className: 'border-red-400/40 bg-red-500/15 text-red-200',
  },
  WARM: {
    label: 'Warm Lead',
    className: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  },
  COLD: {
    label: 'Cold Lead',
    className: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  },
}
