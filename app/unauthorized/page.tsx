import Link from 'next/link'

export default function UnauthorizedPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const reasonRaw = searchParams?.reason
  const reason = Array.isArray(reasonRaw) ? reasonRaw[0] : reasonRaw

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">Unauthorized</h1>
          <p className="mt-3 text-gray-600">You don&apos;t have access to this page.</p>
          {reason ? <p className="mt-2 text-sm font-semibold text-gray-700">Reason: {String(reason)}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-semibold text-dark-blue hover:bg-gray-50"
            >
              Go to Home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
