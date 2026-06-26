import Link from 'next/link'
export default function AgencyRejectedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Not Approved</h1>
        <p className="text-gray-600 mb-6">
          Unfortunately your agency application was not approved at this time. Please contact our support team for more information.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/contact" className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue text-white px-6 text-sm font-semibold">Contact Support</Link>
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 text-gray-700 px-6 text-sm font-semibold hover:bg-gray-50">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
