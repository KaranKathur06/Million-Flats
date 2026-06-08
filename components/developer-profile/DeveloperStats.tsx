import type { DeveloperProfileData } from './types'

type DeveloperStatsProps = {
  developer: DeveloperProfileData
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.3
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < full ? 'text-amber-400' : i === full && hasHalf ? 'text-amber-300' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1.5 text-sm font-bold text-gray-700">{rating.toFixed(1)}</span>
    </span>
  )
}

export default function DeveloperStats({ developer }: DeveloperStatsProps) {
  const { stats } = developer
  const activeProjects = stats.projects
  const delivered = developer.projectsDelivered || 0
  const countries = developer.countriesPresent || 1
  const rating = developer.customerRating

  const items = [
    {
      label: 'Years Experience',
      value: `${stats.experience}+`,
      icon: (
        <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Projects Delivered',
      value: delivered > 0 ? `${delivered}+` : `${activeProjects}+`,
      icon: (
        <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Active Projects',
      value: `${activeProjects}`,
      icon: (
        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: 'Countries Present',
      value: `${countries}`,
      icon: (
        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <section className="relative z-10 -mt-10 pb-4 sm:-mt-12">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg shadow-black/5 sm:p-6">
          {/* Developer Trust Profile heading */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Developer Trust Profile</h2>
            </div>
            {rating && rating > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={rating} />
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {items.map((item) => (
              <article key={item.label} className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-50/50 border border-gray-100 px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  {item.icon}
                </div>
                <p className="text-xl font-bold text-dark-blue sm:text-2xl">{item.value}</p>
                <p className="mt-0.5 text-xs text-gray-500 font-medium">{item.label}</p>
              </article>
            ))}
          </div>

          {/* Price range if available */}
          {stats.startingPriceRange && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center gap-3">
              <svg className="h-5 w-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-amber-700">Starting Price Range</p>
                <p className="text-sm font-bold text-amber-800">{stats.startingPriceRange}</p>
              </div>
            </div>
          )}

          {/* Verix Score if available */}
          {developer.verixScore && developer.verixScore > 0 && (
            <div className="mt-4 rounded-xl bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 px-4 py-3 flex items-center gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{developer.verixScore}</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Verix Developer Score™</p>
                <p className="text-sm text-gray-600">
                  {developer.verixScore >= 90 ? 'Excellent Developer' : developer.verixScore >= 75 ? 'Very Good Developer' : developer.verixScore >= 60 ? 'Good Developer' : 'Emerging Developer'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
