import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account Suspended | MillionFlats Developer Portal' }

export default function DeveloperSuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Your developer account has been suspended. This may be due to a policy violation or a pending compliance issue. Please contact our support team to resolve this.
        </p>
        <a
          href="mailto:support@millionflats.com?subject=Account%20Suspension%20Inquiry"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-dark-blue text-white rounded-xl text-sm font-semibold hover:bg-dark-blue/90 transition-all"
        >
          Contact Support
        </a>
      </div>
    </div>
  )
}
