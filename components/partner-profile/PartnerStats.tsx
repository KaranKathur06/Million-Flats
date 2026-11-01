import type { PartnerProfileData } from './types'

type PartnerStatsProps = {
  partner: PartnerProfileData
}

export default function PartnerStats({ partner }: PartnerStatsProps) {
  const { stats } = partner

  const items = [
    stats.projectsCompleted != null
      ? { label: 'Projects completed', value: stats.projectsCompleted.toLocaleString() }
      : null,
    stats.experience != null
      ? { label: 'Years of experience', value: `${stats.experience} years` }
      : null,
    stats.rating != null
      ? { label: 'Partner rating', value: stats.rating.toFixed(1) }
      : null,
    stats.teamSize != null
      ? { label: 'Team size', value: stats.teamSize.toLocaleString() }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null)

  if (items.length === 0) return null

  return (
    <section aria-label="Partner profile metrics" className="py-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5"
          >
            <div className="text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">{item.value}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
