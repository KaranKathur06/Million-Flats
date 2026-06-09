import Link from 'next/link'

export default function ProjectNotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Project unavailable</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-serif font-bold text-dark-blue">This project is not published</h1>
        <p className="mt-4 text-gray-600">
          The project may be in draft, archived, or the link may be outdated. Published projects appear in the directory
          with status <strong>Published</strong> in admin.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/projects"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90"
          >
            Browse all projects
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-semibold text-dark-blue hover:bg-gray-50"
          >
            Request details
          </Link>
        </div>
      </div>
    </div>
  )
}
