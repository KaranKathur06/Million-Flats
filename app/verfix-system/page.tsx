import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function VerfixSystemPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/user/login?next=%2Fverfix-system')
  }

  const role = String((session.user as any)?.role || '').toUpperCase()
  if (role !== 'USER') {
    redirect('/unauthorized?reason=verfix_forbidden')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">Verfix System™</h1>
          <p className="text-lg text-gray-600">
            Verfix System™ helps users evaluate and transact with confidence.
          </p>
        </div>
      </div>
    </div>
  )
}
