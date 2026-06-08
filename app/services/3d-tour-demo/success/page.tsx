import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata = {
  title: 'Consultation Received | MillionFlats 3D Tours',
}

export default async function ThreeDTourDemoSuccessPage({
  searchParams,
}: {
  searchParams: { ref?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/login?next=%2Fservices%2F3d-tour-demo')
  }

  const reference = String(searchParams?.ref || '').trim() || 'Pending'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-3xl font-extrabold text-dark-blue">Thank you</h1>
        <p className="mt-3 text-slate-600">Your 3D Tour consultation request has been received.</p>
        <dl className="mt-8 rounded-xl bg-slate-50 border border-slate-100 p-5 text-left text-sm space-y-3">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 font-semibold">Reference</dt>
            <dd className="font-mono text-dark-blue text-xs truncate max-w-[200px]">{reference}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 font-semibold">Response time</dt>
            <dd className="text-dark-blue font-medium">Within 24 business hours</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 font-semibold">Email</dt>
            <dd className="text-dark-blue">Confirmation sent to your inbox</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-slate-500">
          Need urgent assistance? WhatsApp our team or reply to your confirmation email.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/services/3d-tours"
            className="inline-flex h-11 items-center justify-center px-6 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to 3D Tours
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center px-6 rounded-xl bg-dark-blue text-white font-semibold"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
