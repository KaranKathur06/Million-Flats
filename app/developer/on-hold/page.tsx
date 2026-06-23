import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Under Review | MillionFlats Developer Portal' }

export default function DeveloperOnHoldPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = searchParams?.reason || ''
  const isDocUploaded = reason === 'documents_uploaded' || reason === 'under_review'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Account is Under Review</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {isDocUploaded
            ? 'We\'ve received your documents and are currently verifying your details. This typically takes 1–3 business days.'
            : 'Your developer account is pending approval. You\'ll be able to publish projects and receive leads once approved.'}
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-4 text-left text-sm text-amber-700 mb-6">
          <p className="font-semibold mb-2">While you wait, you can:</p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2"><span className="text-amber-400">→</span> Complete any missing profile sections</li>
            <li className="flex items-center gap-2"><span className="text-amber-400">→</span> Prepare your project details and media</li>
            <li className="flex items-center gap-2"><span className="text-amber-400">→</span> Review our listing guidelines</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Link href="/developer/profile" className="flex-1 h-10 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
            Edit Profile
          </Link>
          <Link href="/developer/verification" className="flex-1 h-10 flex items-center justify-center text-sm font-medium text-white bg-dark-blue hover:bg-dark-blue/90 rounded-xl transition-all">
            View Documents
          </Link>
        </div>
      </div>
    </div>
  )
}
