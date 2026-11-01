import { redirect } from 'next/navigation'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import AcceptEcosystemInvitation from './AcceptEcosystemInvitation'

export const dynamic = 'force-dynamic'

export default async function AcceptInvitationPage({ searchParams }: { searchParams?: { token?: string } }) {
  const user = await getAuthenticatedEcosystemUser()
  const token = searchParams?.token || ''
  if (!user) {
    const callback = `/dashboard/ecosystem-partner/invitations/accept?token=${encodeURIComponent(token)}`
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`)
  }
  return <AcceptEcosystemInvitation token={token} />
}
