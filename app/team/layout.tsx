/**
 * /team — private internal team directory
 *
 * Access control enforced server-side:
 *  1. Middleware redirects unauthenticated visitors to /auth/login
 *  2. This layout enforces team membership via requireTeamAccess()
 *  3. Non-members receive a 403 redirect to /unauthorized
 *
 * Page is force-dynamic and never publicly cached or statically generated.
 */

import { redirect } from 'next/navigation'
import { requireTeamAccess } from '@/lib/team/auth'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'MillionFlats Team',
  robots: { index: false, follow: false },
}

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireTeamAccess()
  if (!auth.ok) {
    if (auth.status === 401) redirect('/auth/login?next=/team')
    redirect('/unauthorized?reason=team_access_required')
  }

  return <>{children}</>
}
