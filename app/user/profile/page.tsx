import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import UserProfileClient from './UserProfileClient'

export default async function UserProfilePage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fuser%2Fprofile')
  }

  if (role !== 'USER') {
    redirect(getHomeRouteForRole(role))
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    redirect('/user/login?next=%2Fuser%2Fprofile')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    redirect('/user/login?next=%2Fuser%2Fprofile')
  }

  return (
    <UserProfileClient
      initialName={user.name || ''}
      email={user.email}
      initialPhone={user.phone || ''}
    />
  )
}
