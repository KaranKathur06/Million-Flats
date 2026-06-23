import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Account Rejected | MillionFlats Developer Portal' }

export default function DeveloperRejectedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Not Approved</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Unfortunately, your developer application did not meet our verification requirements. Please check your email for the rejection reason and resubmit after making the necessary corrections.
        </p>
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 mb-6 text-left">
          <p className="font-semibold mb-1">Common rejection reasons:</p>
          <ul className="space-y-1 list-disc list-inside text-red-600">
            <li>Invalid or expired RERA certificate</li>
            <li>Blurry or illegible document uploads</li>
            <li>Mismatch between company details and documents</li>
            <li>Incomplete profile information</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Link href="/developer/profile" className="flex-1 h-10 flex items-center justify-center text-sm font-medium text-white bg-dark-blue hover:bg-dark-blue/90 rounded-xl transition-all">
            Update Profile
          </Link>
          <Link href="/developer/verification" className="flex-1 h-10 flex items-center justify-center text-sm font-medium text-dark-blue bg-blue-50 hover:bg-blue-100 rounded-xl transition-all">
            Re-upload Docs
          </Link>
        </div>
        <p className="mt-5 text-xs text-gray-400">
          Questions? <a href="mailto:support@millionflats.com" className="text-dark-blue hover:underline">Contact our support team</a>
        </p>
      </div>
    </div>
  )
}
