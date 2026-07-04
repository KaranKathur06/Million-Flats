import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import DeveloperShellClient from './_components/DeveloperShellClient'

export default async function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/developer/auth?tab=login')
  }

  const role = (session.user as any)?.role
  if (role !== 'DEVELOPER') {
    redirect('/unauthorized?reason=developer_only')
  }

  return <DeveloperShellClient session={session}>{children}</DeveloperShellClient>
}
