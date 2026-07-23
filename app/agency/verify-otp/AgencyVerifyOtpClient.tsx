'use client'

import { useSearchParams } from 'next/navigation'
import EmailVerificationPage from '@/components/auth/EmailVerificationPage'

export default function AgencyVerifyOtpClient() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''

  return (
    <EmailVerificationPage
      portalType="agency"
      portalLabel="Agency Verification"
      email={email}
      redirectOnSuccess="/agency/dashboard"
    />
  )
}
