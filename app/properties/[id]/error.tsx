'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-xl px-6">
        <h1 className="text-4xl font-serif font-bold text-dark-blue mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-8">We couldn&apos;t load this property right now. Please try again.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center bg-dark-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/properties"
            className="inline-flex items-center justify-center bg-gray-100 text-dark-blue px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Browse Properties
          </Link>
        </div>
      </div>
    </div>
  )
}
