import type { DeveloperAchievementItem } from './types'

type DeveloperAchievementsProps = {
  achievements: DeveloperAchievementItem[]
  developerName: string
}

export default function DeveloperAchievements({ achievements, developerName }: DeveloperAchievementsProps) {
  if (achievements.length === 0) return null

  return (
    <section className="py-12 sm:py-14 lg:py-16 bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">
            Achievements &amp; Certifications
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Awards, certifications, and milestones by {developerName}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((item) => (
            <article
              key={item.id}
              className="group rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
            >
              <div className="flex items-start gap-4">
                {item.imageUrl ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gray-100 flex-shrink-0 border border-gray-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                    <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-dark-blue line-clamp-2">{item.title}</h3>
                  {item.awardDate && (
                    <p className="mt-1 text-xs text-gray-400 font-medium">
                      {new Date(item.awardDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-3">{item.description}</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
