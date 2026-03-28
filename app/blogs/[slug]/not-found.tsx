import Link from 'next/link'

export default function BlogNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4 py-20 text-center">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-6xl font-black text-gray-200">404</div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Blog Not Found</h1>
        <p className="mt-3 text-base text-gray-500">
          The blog post you&apos;re looking for doesn&apos;t exist, may have been removed, or is not yet published.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/blogs"
            prefetch={true}
            className="inline-flex h-11 items-center rounded-xl bg-dark-blue px-6 text-sm font-semibold text-white transition hover:bg-dark-blue/90"
          >
            Browse All Blogs
          </Link>
          <Link
            href="/"
            prefetch={true}
            className="inline-flex h-11 items-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  )
}
