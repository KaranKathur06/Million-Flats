'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">500</p>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Server Error</h1>
            <p className="mt-4 text-lg text-gray-600">
              Something went wrong on our end. Please try again or contact support.
            </p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-8 sm:p-10">
            <div className="text-sm font-semibold text-dark-blue">What you can do</div>
            <div className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-gray-900">
              Return to a working page or try again
            </div>
            <div className="mt-3 text-gray-600">
              Try refreshing the page or navigate to one of our main sections.
            </div>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                Go Home
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
