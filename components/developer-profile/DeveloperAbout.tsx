import type { DeveloperProfileData } from './types'

type DeveloperAboutProps = {
  developer: DeveloperProfileData
}

export default function DeveloperAbout({ developer }: DeveloperAboutProps) {
  const paragraphs = developer.description
    .split('\n\n')
    .map((entry) => entry.trim())
    .filter(Boolean)

  return (
    <section className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:gap-10 lg:px-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">About {developer.name}</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-gray-600 sm:text-base">
            {paragraphs.map((paragraph, index) => (
              <p key={`${developer.name}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-dark-blue">Developer Snapshot</h3>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="border-b border-gray-100 pb-3">
              <dt className="text-gray-500">Founded Year</dt>
              <dd className="mt-1 font-semibold text-gray-800">{developer.founded_year || 'N/A'}</dd>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <dt className="text-gray-500">HQ Location</dt>
              <dd className="mt-1 font-semibold text-gray-800">
                {developer.city}, {developer.country}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Specialization</dt>
              <dd className="mt-1 font-semibold text-gray-800">{developer.specialization}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}
