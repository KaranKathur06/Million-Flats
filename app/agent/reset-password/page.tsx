import type { Metadata } from 'next'
import ResetPasswordClient from '@/app/user/reset-password/ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password | Agent Portal | MillionFlats',
  description: 'Create a new password for your MillionFlats Agent Portal account.',
}

export default function AgentResetPasswordPage() {
  return <ResetPasswordClient loginHref="/agent/auth?tab=login" />
}
