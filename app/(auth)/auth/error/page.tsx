import Link from 'next/link'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const errorRaw = searchParams?.error
  const error = Array.isArray(errorRaw) ? errorRaw[0] : errorRaw

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Authentication Error</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">We couldn’t complete sign in</h1>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Error code:</span> {error || 'unknown'}
            </p>
          </div>

          <div className="mt-6 space-y-3 text-sm text-gray-600">
            <p>Try again from the correct portal:</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/user/login"
                className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors"
              >
                User Login
              </Link>
              <Link
                href="/agent/login"
                className="inline-flex items-center justify-center h-11 px-4 rounded-xl border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-50 transition-colors"
              >
                Agent Login
              </Link>
            </div>
          </div>

          <div className="mt-8 text-xs text-gray-500 leading-relaxed">
            <p>
              If this happens only with Google sign-in, verify your production environment has:
              NEXTAUTH_URL, NEXTAUTH_SECRET (or JWT_SECRET), GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
