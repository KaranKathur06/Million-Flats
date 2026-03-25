import type { DeveloperProfileData } from './types'

type DeveloperStatsProps = {
  stats: DeveloperProfileData['stats']
}

export default function DeveloperStats({ stats }: DeveloperStatsProps) {
  const items = [
    { label: 'Years of Experience', value: `${stats.experience}+` },
    { label: 'Projects Delivered', value: `${stats.projects}+` },
    { label: 'Cities Presence', value: `${stats.cities}+` },
    ...(stats.startingPriceRange ? [{ label: 'Starting Price Range', value: stats.startingPriceRange }] : []),
  ]

  return (
    <section className="relative z-10 -mt-10 pb-4 sm:-mt-12">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:gap-4 sm:p-5">
          {items.map((item) => (
            <article key={item.label} className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-lg font-bold text-dark-blue sm:text-xl">{item.value}</p>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">{item.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
