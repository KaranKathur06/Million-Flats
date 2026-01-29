import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-serif font-bold text-dark-blue mb-4">Property Not Found</h1>
        <p className="text-gray-600 mb-8">The property you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/buy"
          className="inline-block bg-dark-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
        >
          Browse Properties
        </Link>
      </div>
    </div>
  )
}

