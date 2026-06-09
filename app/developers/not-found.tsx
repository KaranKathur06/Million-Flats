import Link from 'next/link'

export default function DeveloperNotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Developer unavailable</p>
        <h1 className="mt-2 text-3xl font-serif font-bold text-dark-blue sm:text-4xl">
          This developer profile is not available
        </h1>
        <p className="mt-4 text-gray-600">
          The developer may be inactive, the slug may have changed, or the profile is still being published. Browse the
          directory for active developers.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/developers"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90"
          >
            Browse developers
          </Link>
          <Link
            href="/projects"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-semibold text-dark-blue hover:bg-gray-50"
          >
            View projects
          </Link>
        </div>
      </div>
    </div>
  )
}
