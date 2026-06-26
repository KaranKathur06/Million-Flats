import Link from 'next/link'
export default function AgencyOnHoldPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = searchParams?.reason || 'under_review'
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Under Review</h1>
        <p className="text-gray-600 mb-6">
          {reason === 'documents_uploaded'
            ? 'Your documents have been uploaded and are being reviewed by our team.'
            : 'Your agency profile is currently under review. We\'ll notify you once the review is complete.'}
        </p>
        <p className="text-sm text-gray-500 mb-8">This typically takes 24–48 business hours.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/agency/profile" className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue text-white px-6 text-sm font-semibold">
            View Profile
          </Link>
          <Link href="/contact" className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 text-gray-700 px-6 text-sm font-semibold hover:bg-gray-50">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
