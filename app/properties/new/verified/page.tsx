import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function NewPropertyVerifiedPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/login?next=%2Fproperties%2Fnew%2Fverified')
  }

  if (role !== 'AGENT') {
    redirect('/user/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Verified Projects</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">List from Verified Projects</h1>
          <p className="mt-3 text-gray-600">
            This flow will connect to Reelly verified inventory. Manual listings are available now.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/properties/new/manual"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
            >
              Add Manual Property
            </Link>
            <Link
              href="/properties"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
            >
              Browse Verified Projects
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
