import type { PartnerProfileData } from './types'

type PartnerStatsProps = {
  partner: PartnerProfileData
}

export default function PartnerStats({ partner }: PartnerStatsProps) {
  const { stats } = partner

  const items = [
    stats.projectsCompleted != null
      ? { label: 'Projects Completed', value: `${stats.projectsCompleted}+` }
      : null,
    stats.experience != null
      ? { label: 'Years Experience', value: `${stats.experience}+` }
      : null,
    stats.rating != null
      ? { label: 'Client Rating', value: stats.rating.toFixed(1) }
      : null,
    stats.teamSize != null
      ? { label: 'Team Members', value: `${stats.teamSize}+` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]

  if (items.length === 0) return null

  return (
    <section className="border-b border-gray-200 bg-white py-8">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-4 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5 text-center">
            <div className="text-2xl font-bold text-dark-blue sm:text-3xl">{item.value}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
