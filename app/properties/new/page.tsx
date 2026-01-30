import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function NewPropertyPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/login?next=%2Fproperties%2Fnew')
  }

  if (role !== 'AGENT') {
    redirect('/user/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Listings</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">
            How would you like to add a property?
          </h1>
          <p className="mt-3 text-gray-600">
            Verified projects use structured data. Manual listings are agent-owned inventory and are reviewed before going live.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link
              href="/properties/new/verified"
              className="rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors p-6"
            >
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Option A</p>
              <h2 className="mt-2 text-xl font-serif font-bold text-dark-blue">List from Verified Projects</h2>
              <p className="mt-2 text-sm text-gray-600">
                Uses Reelly APIs. Structured, consistent, and faster.
              </p>
              <div className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold">
                Continue
              </div>
            </Link>

            <Link
              href="/properties/new/manual"
              className="rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors p-6"
            >
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Option B</p>
              <h2 className="mt-2 text-xl font-serif font-bold text-dark-blue">Add Manual Property</h2>
              <p className="mt-2 text-sm text-gray-600">
                Agent-owned / exclusive. Full manual entry. Subject to review.
              </p>
              <div className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold">
                Continue
              </div>
            </Link>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/agent-portal"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
            >
              Back to Agent Portal
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
            >
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
