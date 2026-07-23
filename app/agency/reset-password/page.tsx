import type { Metadata } from 'next'
import ResetPasswordClient from '@/app/user/reset-password/ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password | Agency Portal | MillionFlats',
  description: 'Create a new password for your MillionFlats Agency Portal account.',
}

export default function AgencyResetPasswordPage() {
  return <ResetPasswordClient loginHref="/agency/auth?tab=login" />
}
