import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fsettings')
  }

  if (role !== 'USER') {
    redirect(getHomeRouteForRole(role))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">Settings</h1>

          <div className="mt-8 space-y-6">
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Notification preferences</h2>
              <p className="mt-2 text-sm text-gray-600">Manage your email and in-app notifications.</p>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Privacy controls</h2>
              <p className="mt-2 text-sm text-gray-600">Control how your information is used and displayed.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
