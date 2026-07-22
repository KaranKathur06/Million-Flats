'use client'

import { useSearchParams } from 'next/navigation'
import EmailVerificationPage from '@/components/auth/EmailVerificationPage'

export default function VerifyClient() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''

  return (
    <EmailVerificationPage
      portalType="agent"
      portalLabel="Agent Verification"
      email={email}
      redirectOnSuccess="/agent/onboarding"
    />
  )
}
