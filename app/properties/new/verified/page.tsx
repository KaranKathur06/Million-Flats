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

  redirect('/properties/new/manual')
}
