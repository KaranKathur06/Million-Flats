import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import DeveloperShellClient from './_components/DeveloperShellClient'

const DEVELOPER_AUTH_PATHS = [
  '/developer/auth',
  '/developer/login',
  '/developer/register',
  '/developer/forgot-password',
  '/developer/verify-email',
  '/developer/verify',
]

function isDeveloperAuthPath(pathname: string) {
  return DEVELOPER_AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export default async function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  
  // This layout wraps all /developer/* routes, including auth pages
  // Don't redirect on auth pages - let them render independently
  // Only render shell for authenticated, authorized developers
  
  if (session?.user && role === 'DEVELOPER') {
    // User is authenticated and authorized - render with shell
    return <DeveloperShellClient session={session}>{children}</DeveloperShellClient>
  }
  
  // Not authenticated or wrong role - just render children
  // Page component (auth page) will handle showing appropriate content
  return <>{children}</>
}
