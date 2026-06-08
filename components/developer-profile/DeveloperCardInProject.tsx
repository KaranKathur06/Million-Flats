import Link from 'next/link'

type DeveloperCardInProjectProps = {
  developer: {
    id: string
    name: string
    slug: string | null
    logo: string | null
    foundedYear?: number | null
    customerRating?: number | null
    _count?: { projects: number }
  }
}

export default function DeveloperCardInProject({ developer }: DeveloperCardInProjectProps) {
  const currentYear = new Date().getFullYear()
  const experience = developer.foundedYear ? currentYear - developer.foundedYear : null
  const projectCount = developer._count?.projects || 0

  const content = (
    <div className="flex items-center gap-3.5">
      {/* Logo */}
      {developer.logo ? (
        <img
          src={developer.logo}
          alt={developer.name}
          className="h-12 w-12 rounded-xl object-cover border border-gray-100"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-base font-bold text-dark-blue">
          {developer.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{developer.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-gray-400">
          {experience && experience > 0 && (
            <span>{experience}y Experience</span>
          )}
          {projectCount > 0 && (
            <span>{projectCount} Projects</span>
          )}
          {developer.customerRating && developer.customerRating > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <svg className="h-3 w-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {developer.customerRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      {developer.slug && (
        <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  )

  if (!developer.slug) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 hover:shadow-md transition-shadow">
        {content}
      </div>
    )
  }

  return (
    <Link
      href={`/developers/${developer.slug}`}
      className="block rounded-xl border border-gray-200 bg-white p-3.5 hover:shadow-md hover:border-primary-200 transition-all"
    >
      {content}
    </Link>
  )
}
