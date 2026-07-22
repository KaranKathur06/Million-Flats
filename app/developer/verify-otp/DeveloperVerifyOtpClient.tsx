'use client'

import { useSearchParams } from 'next/navigation'
import EmailVerificationPage from '@/components/auth/EmailVerificationPage'

export default function DeveloperVerifyOtpClient() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''

  return (
    <EmailVerificationPage
      portalType="developer"
      portalLabel="Developer Verification"
      email={email}
      redirectOnSuccess={`/developer/auth?tab=login&verified=1`}
    />
  )
}
