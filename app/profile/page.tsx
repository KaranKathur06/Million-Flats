import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fprofile')
  }

  if (role !== 'USER') {
    redirect('/agent-portal')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">My Profile</h1>

          <div className="mt-8 space-y-6">
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Personal Info</h2>
              <p className="mt-2 text-sm text-gray-600">View and manage your personal details.</p>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Saved Properties</h2>
              <p className="mt-2 text-sm text-gray-600">Your saved listings will appear here.</p>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Preferences</h2>
              <p className="mt-2 text-sm text-gray-600">Control your search and recommendation preferences.</p>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Security</h2>
              <p className="mt-2 text-sm text-gray-600">Update security settings related to your account.</p>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-dark-blue">Logout</h2>
              <p className="mt-2 text-sm text-gray-600">Use the navigation menu to sign out.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
