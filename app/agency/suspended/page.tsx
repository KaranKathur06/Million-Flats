import Link from 'next/link'
export default function AgencySuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Suspended</h1>
        <p className="text-gray-600 mb-6">
          Your agency account has been temporarily suspended. Please contact support to resolve this.
        </p>
        <Link href="/contact" className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue text-white px-6 text-sm font-semibold">
          Contact Support
        </Link>
      </div>
    </div>
  )
}
