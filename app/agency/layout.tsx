import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AgencyShellClient from './_components/AgencyShellClient'

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  
  // This layout wraps all /agency/* routes, including auth pages
  // Don't redirect on auth pages - let them render independently
  // Only render content for authenticated, authorized agencies
  
  if (session?.user && role === 'AGENCY') {
    // User is authenticated and authorized
    return <AgencyShellClient session={session}>{children}</AgencyShellClient>
  }
  
  // Not authenticated or wrong role - just render children
  // Page component (auth page) will handle showing appropriate content
  return <>{children}</>
}
